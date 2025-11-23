// ========== MUSIC PLAYER - YOUTUBE API INTEGRATION ==========
//
// PERFORMANCE & API QUOTA OPTIMIZATION:
// This player implements localStorage caching to reduce YouTube API calls.
// - Cache Duration: 24 hours (configurable via CACHE_DURATION)
// - API calls only made when cache is empty or expired
// - Fallback to stale cache if API fails (offline resilience)
// - Saves ~2 API calls per page load for returning visitors
// - Debug tools available: MusicPlayer.getCacheInfo(), MusicPlayer.refreshCache()

const YOUTUBE_API_KEY = 'AIzaSyCxBqRgZkK3hlCz0AFoY2Ni5YtrP6bufsw';
const PLAYLIST_ID = 'PL6JY_zJieinfhtDbw0g6ZwV2s2heGKoXB';
const MAX_RESULTS = 12;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds
const CACHE_KEY = 'youtube_playlist_cache';
const CACHE_TIMESTAMP_KEY = 'youtube_playlist_cache_timestamp';

// Player State
let player;
let playlist = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isBuffering = false;
let isShuffle = false;
let repeatMode = 'all'; // 'off', 'all', 'one' - Default to 'all'
let currentVolume = 100;
let progressInterval;
let shuffleQueue = [];
let shuffleHistory = [];
let wasPlayingBeforeChange = false;
let playerReady = false;

// Debug mode for Instagram browser testing (disabled in production)
const DEBUG_MODE = false; // Set to true to enable debug panel
let debugLogs = [];

// Instagram auto-restart management
let instagramAutoRestart = false;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;

// Performance optimizations: Cache DOM elements
let trackElements = [];
let shareMenus = [];
let likedTracksCache = null;

// DJ Looper state
let looperMode = 'off'; // 'off', '1/64', '1/32', '1/16', '1/8', '1/4'
let looperInterval;
let loopStartTime = 0;
let loopDuration = 0;
const BPM = 120; // Default BPM, can be adjusted

// DOM Elements - Cache for performance
const DOM = {
    // States
    loadingState: document.getElementById('loading-state'),
    musicPlayer: document.getElementById('music-player'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),

    // Current track info
    albumArt: document.getElementById('current-album-art'),
    playingIndicator: document.getElementById('playing-indicator'),
    trackTitle: document.getElementById('current-track-title'),
    trackArtist: document.getElementById('current-track-artist'),
    trackMeta: document.getElementById('current-track-meta'),

    // Control buttons
    playPauseBtn: document.getElementById('play-pause-btn'),
    playIcon: document.getElementById('play-icon'),
    pauseIcon: document.getElementById('pause-icon'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    repeatBtn: document.getElementById('repeat-btn'),
    looperBtn: document.getElementById('looper-btn'),
    looperLabel: document.querySelector('.looper-label'),

    // Progress
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    currentTime: document.getElementById('current-time'),
    durationTime: document.getElementById('duration-time'),

    // Volume
    volumeBtn: document.getElementById('volume-btn'),
    volumeSlider: document.getElementById('volume-slider'),

    // Tracklist
    tracklistContainer: document.getElementById('tracklist'),
    trackCount: document.getElementById('track-count'),

    // Notification
    notificationToast: document.getElementById('notification-toast')
};

// ========== YOUTUBE API INITIALIZATION ==========

function onYouTubeIframeAPIReady() {
    fetchTracks();
}

// Make it globally accessible for YouTube API
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// ========== CACHE MANAGEMENT ==========

function getCachedPlaylist() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

        if (!cachedData || !cacheTimestamp) {
            return null;
        }

        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();

        // Check if cache is still valid
        if (now - timestamp > CACHE_DURATION) {
            console.log('Cache expired, will fetch fresh data');
            return null;
        }

        console.log('Using cached playlist data');
        return JSON.parse(cachedData);
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

function setCachedPlaylist(playlistData) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(playlistData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log('Playlist cached successfully');
    } catch (error) {
        console.error('Error caching playlist:', error);
    }
}

function clearPlaylistCache() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('Cache cleared');
}

// ========== BROWSER COMPATIBILITY POLYFILLS ==========

// Polyfill for fetch if not available (older browsers)
if (!window.fetch) {
    console.warn('Fetch API not supported. Using XMLHttpRequest fallback.');
}

// ========== FETCH TRACKS FROM YOUTUBE PLAYLIST ==========

async function fetchTracks() {
    try {
        // Check cache first
        const cachedPlaylist = getCachedPlaylist();

        if (cachedPlaylist && cachedPlaylist.length > 0) {
            playlist = cachedPlaylist;
            // Track cache hit
            if (window.Analytics) {
                Analytics.trackPlaylistLoad(true);
            }
            initializePlayer();
            renderTracklist();
            hideLoading();
            return;
        }

        console.log('Fetching fresh data from YouTube API...');

        // Fetch playlist items
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${YOUTUBE_API_KEY}&playlistId=${PLAYLIST_ID}&part=snippet&maxResults=${MAX_RESULTS}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            throw new Error('No music releases found in playlist');
        }

        // Get video durations and statistics
        const videoIds = data.items.map(item => item.snippet.resourceId.videoId).join(',');
        const durationUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails,statistics`;

        const durationResponse = await fetch(durationUrl);

        if (!durationResponse.ok) {
            throw new Error(`API Error: ${durationResponse.status}`);
        }

        const durationData = await durationResponse.json();

        // Build playlist (maintain playlist order)
        playlist = data.items.map((item, index) => {
            const videoId = item.snippet.resourceId.videoId;
            const durationInfo = durationData.items ? durationData.items.find(v => v.id === videoId) : null;
            const duration = durationInfo ? parseDuration(durationInfo.contentDetails.duration) : 0;

            // Use custom high-quality album art for all tracks
            const thumbnailUrl = 'albumart.webp';

            return {
                id: videoId,
                title: item.snippet.title,
                thumbnail: thumbnailUrl,
                publishedAt: item.snippet.publishedAt,
                duration: duration,
                views: durationInfo ? parseInt(durationInfo.statistics.viewCount) : 0
            };
        });

        // Cache the playlist data
        setCachedPlaylist(playlist);

        // Track API fetch
        if (window.Analytics) {
            Analytics.trackPlaylistLoad(false);
        }

        initializePlayer();
        renderTracklist();
        hideLoading();

    } catch (error) {
        console.error('Error fetching tracks:', error);

        // Track error
        if (window.Analytics) {
            Analytics.trackPlaylistError(error.message);
        }

        // Try to use cached data as fallback even if expired
        const cachedPlaylist = localStorage.getItem(CACHE_KEY);
        if (cachedPlaylist) {
            console.log('Using stale cache as fallback');
            try {
                playlist = JSON.parse(cachedPlaylist);
                initializePlayer();
                renderTracklist();
                hideLoading();
                return;
            } catch (cacheError) {
                console.error('Failed to parse cached data:', cacheError);
            }
        }

        showError(error.message);
    }
}

// Parse ISO 8601 duration format
function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '0H').slice(0, -1);
    const minutes = (match[2] || '0M').slice(0, -1);
    const seconds = (match[3] || '0S').slice(0, -1);
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

// ========== YOUTUBE PLAYER INITIALIZATION ==========

function initializePlayer() {
    // Enhanced player parameters for better cross-browser compatibility
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: playlist[0].id,
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'rel': 0,
            'showinfo': 0,
            'modestbranding': 1,
            'playsinline': 1, // Critical for Instagram/iOS browsers
            'enablejsapi': 1,
            'origin': window.location.origin, // Required for some mobile browsers
            'widget_referrer': window.location.href,
            'fs': 0, // Disable fullscreen for in-app browsers
            'disablekb': 1 // Disable keyboard controls for embedded player
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    playerReady = true;
    player.setVolume(currentVolume);
    updateCurrentTrack();

    // Set repeat button UI to active by default (since repeatMode is 'all')
    DOM.repeatBtn.classList.add('active');
    DOM.repeatBtn.title = 'Repeat: All Tracks';

    debugLog('YouTube player ready');
    debugLog('User Agent: ' + navigator.userAgent.substring(0, 50) + '...');

    // Detect Instagram/social media in-app browsers that block autoplay
    const isInAppBrowser = /Instagram|FBAN|FBAV|Twitter|LinkedIn/i.test(navigator.userAgent);

    if (!isInAppBrowser) {
        // Only autoplay on regular browsers
        debugLog('Regular browser - attempting autoplay');
        player.playVideo();
    } else {
        debugLog('Instagram browser detected!');
        debugLog('Autoplay disabled - user must tap play');

        // Show helpful message to user
        showNotification('🎵 Tap the play button to start listening', 4000);

        // Cue the video so it's ready to play on user interaction
        player.cueVideoById(playlist[0].id);
        debugLog('Video cued and ready');
    }
}

function onPlayerStateChange(event) {
    const stateNames = {'-1': 'UNSTARTED', '0': 'ENDED', '1': 'PLAYING', '2': 'PAUSED', '3': 'BUFFERING', '5': 'CUED'};
    debugLog('State change: ' + (stateNames[event.data] || event.data));

    // Remove loading state when player responds
    DOM.playPauseBtn.classList.remove('loading');

    switch(event.data) {
        case YT.PlayerState.ENDED:
            isPlaying = false;
            isBuffering = false;
            instagramAutoRestart = false; // Disable auto-restart on track end
            // Track completion before track ends
            if (window.Analytics) {
                const track = playlist[currentTrackIndex];
                Analytics.trackComplete(track.title, track.duration);
            }
            handleTrackEnd();
            break;

        case YT.PlayerState.PLAYING:
            isPlaying = true;
            isBuffering = false;
            restartAttempts = 0; // Reset restart counter on successful play
            // Track play event
            if (window.Analytics) {
                const track = playlist[currentTrackIndex];
                Analytics.trackPlay(track.title, currentTrackIndex, track.duration);
            }
            updatePlayPauseUI();
            startProgressTracking();
            // Start looper if it's enabled
            if (looperMode !== 'off') {
                startLooper();
            }
            break;

        case YT.PlayerState.PAUSED:
            // Instagram browser auto-restart logic
            const isInAppBrowser = /Instagram|FBAN|FBAV|Twitter|LinkedIn/i.test(navigator.userAgent);

            if (isInAppBrowser && instagramAutoRestart && restartAttempts < MAX_RESTART_ATTEMPTS) {
                // Instagram paused our video - restart it!
                restartAttempts++;
                debugLog('⚠️ Instagram paused playback (attempt ' + restartAttempts + '/' + MAX_RESTART_ATTEMPTS + ')');
                debugLog('🔄 Auto-restarting...');

                setTimeout(() => {
                    player.playVideo();
                }, 200);
            } else {
                // Normal pause or max attempts reached
                if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
                    debugLog('❌ Max restart attempts reached. Stopping auto-restart.');
                    instagramAutoRestart = false;
                    showNotification('⚠️ Instagram keeps pausing. Try "Open on YouTube" button.', 5000);
                }

                isPlaying = false;
                isBuffering = false;
                // Track pause event with listen progress
                if (window.Analytics && player && player.getCurrentTime && player.getDuration) {
                    const track = playlist[currentTrackIndex];
                    Analytics.trackPause(track.title, player.getCurrentTime(), player.getDuration());
                }
                updatePlayPauseUI();
                stopProgressTracking();
                // Stop looper when paused
                stopLooper();
            }
            break;

        case YT.PlayerState.BUFFERING:
            isBuffering = true;
            DOM.playPauseBtn.classList.add('loading');
            // Keep isPlaying state as it was
            break;

        case YT.PlayerState.CUED:
            isPlaying = false;
            isBuffering = false;
            updatePlayPauseUI();
            break;
    }
}

// Handle player errors
function onPlayerError(event) {
    console.error('YouTube player error:', event.data);
    isBuffering = false;
    DOM.playPauseBtn.classList.remove('loading');

    // Error codes: 2 (invalid param), 5 (HTML5 error), 100 (not found), 101/150 (not embeddable)
    const errorCodes = {
        2: 'Invalid video parameter',
        5: 'HTML5 player error',
        100: 'Video not found',
        101: 'Video not allowed to be embedded',
        150: 'Video not allowed to be embedded'
    };

    const errorMsg = errorCodes[event.data] || 'Unknown playback error';
    console.error(errorMsg);

    // Show user-friendly notification for embedding restrictions
    if ([101, 150].includes(event.data)) {
        const track = playlist[currentTrackIndex];
        showNotification(`⚠️ "${track.title}" cannot be played here. Opening on YouTube...`, 3000);

        // Open video on YouTube in new tab
        setTimeout(() => {
            window.open(`https://www.youtube.com/watch?v=${track.id}`, '_blank');
        }, 500);

        // Auto-skip to next track after brief delay
        setTimeout(() => {
            if (currentTrackIndex < playlist.length - 1 || repeatMode === 'all') {
                playNext();
            }
        }, 1500);
    } else if (event.data === 100) {
        // Video not found - just skip
        showNotification('⚠️ Video not available, skipping...', 2000);
        setTimeout(() => {
            if (currentTrackIndex < playlist.length - 1 || repeatMode === 'all') {
                playNext();
            }
        }, 1000);
    } else if ([2, 5].includes(event.data)) {
        // Playback errors - try reloading
        showNotification('⚠️ Playback error, retrying...', 2000);
        setTimeout(() => {
            player.loadVideoById(playlist[currentTrackIndex].id);
        }, 1000);
    }
}

// ========== UI UPDATES ==========

function hideLoading() {
    DOM.loadingState.style.display = 'none';
    DOM.musicPlayer.style.display = 'grid';
}

function showError(message) {
    DOM.loadingState.style.display = 'none';
    DOM.errorState.style.display = 'block';
    DOM.errorMessage.textContent = message;
}

function updateCurrentTrack() {
    const track = playlist[currentTrackIndex];

    DOM.trackTitle.textContent = track.title;
    DOM.trackArtist.textContent = 'Monolit Beatz';
    DOM.trackMeta.textContent = `${formatDate(track.publishedAt)} • ${formatViews(track.views)} views`;
    DOM.albumArt.src = track.thumbnail;
    DOM.durationTime.textContent = formatTime(track.duration);

    // Update active state in tracklist using cached elements
    trackElements.forEach((item, index) => {
        item.classList.toggle('active', index === currentTrackIndex);
    });
}

function updatePlayPauseUI() {
    const { playIcon, pauseIcon, playPauseBtn, albumArt, playingIndicator } = DOM;

    if (isPlaying) {
        Object.assign(playIcon.style, { opacity: '0', transform: 'scale(0.8) rotate(90deg)', display: 'none' });
        pauseIcon.style.display = 'block';

        trackElements[currentTrackIndex]?.classList.add('playing');

        setTimeout(() => {
            Object.assign(pauseIcon.style, { opacity: '1', transform: 'scale(1) rotate(0deg)' });
        }, 10);

        playPauseBtn.setAttribute('aria-label', 'Pause');
        albumArt.classList.add('playing');
        playingIndicator.style.display = 'flex';
    } else {
        Object.assign(pauseIcon.style, { opacity: '0', transform: 'scale(0.8) rotate(-90deg)', display: 'none' });
        playIcon.style.display = 'block';

        trackElements.forEach(item => item.classList.remove('playing'));

        setTimeout(() => {
            Object.assign(playIcon.style, { opacity: '1', transform: 'scale(1) rotate(0deg)' });
        }, 10);

        playPauseBtn.setAttribute('aria-label', 'Play');
        albumArt.classList.remove('playing');
        playingIndicator.style.display = 'none';
    }
}

// ========== TRACKLIST RENDERING ==========

function renderTracklist() {
    DOM.tracklistContainer.innerHTML = '';
    DOM.trackCount.textContent = `${playlist.length} tracks`;

    trackElements = [];
    shareMenus = [];

    const fragment = document.createDocumentFragment();
    playlist.forEach((track, index) => {
        const trackItem = createTrackItem(track, index);
        trackElements.push(trackItem);
        fragment.appendChild(trackItem);
    });

    DOM.tracklistContainer.appendChild(fragment);
}

function createTrackItem(track, index) {
    const div = document.createElement('div');
    div.className = 'track-item';
    div.dataset.index = index;

    const trackNumber = String(index + 1).padStart(2, '0');

    div.innerHTML = `
        <div class="volume-meter">
            <div class="meter-line"></div>
        </div>
        <div class="track-number">${trackNumber}</div>
        <div class="track-info">
            <div class="track-name">${track.title}</div>
            <div class="track-date">${formatDate(track.publishedAt)}</div>
        </div>
        <div class="track-duration">${formatTime(track.duration)}</div>
        <div class="track-actions">
            <button class="track-btn like-btn" aria-label="Like" data-track-id="${track.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
            <div class="share-dropdown">
                <button class="track-btn share-btn" aria-label="Share" data-track-index="${index}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
                <div class="share-menu" id="share-menu-${index}">
                    <div class="share-option" onclick="shareTrack('youtube', '${track.id}')">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <span>Watch on YouTube</span>
                    </div>
                    <div class="share-option" onclick="shareTrack('twitter', '${track.id}', '${encodeURIComponent(track.title)}')">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Share on Twitter</span>
                    </div>
                    <div class="share-option" onclick="shareTrack('facebook', '${track.id}')">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span>Share on Facebook</span>
                    </div>
                    <div class="share-option" onclick="copyTrackLink('${track.id}', ${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        <span>Copy Link</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Click handler for playing track
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.track-actions')) {
            playTrack(index);
        }
    });

    // Initialize like state
    const likeBtn = div.querySelector('.like-btn');
    if (isTrackLiked(track.id)) {
        likeBtn.classList.add('liked');
        likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
    }

    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(track.id, likeBtn);
    });

    // Share button handler
    const shareBtn = div.querySelector('.share-btn');
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleShareMenu(index);
    });

    // Cache share menu element
    const shareMenu = div.querySelector('.share-menu');
    shareMenus.push(shareMenu);

    return div;
}

// ========== PLAYBACK CONTROLS ==========

// Volume fade utility
let fadingVolume = false;

function fadeVolume(targetVolume, duration = 500) {
    if (fadingVolume || !player || !playerReady) return;

    fadingVolume = true;
    const startVolume = player.getVolume();
    const volumeDiff = targetVolume - startVolume;
    const steps = 20;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        // Ease-in-out curve for smooth fade
        const easedProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newVolume = startVolume + (volumeDiff * easedProgress);
        player.setVolume(newVolume);

        if (currentStep >= steps) {
            clearInterval(fadeInterval);
            player.setVolume(targetVolume);
            fadingVolume = false;
        }
    }, stepDuration);
}

// Smart shuffle using Fisher-Yates algorithm
function generateShuffleQueue() {
    shuffleQueue = [...Array(playlist.length).keys()];

    // Fisher-Yates shuffle
    for (let i = shuffleQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
    }

    // Move current track to front to avoid immediate repeat
    const currentIndex = shuffleQueue.indexOf(currentTrackIndex);
    if (currentIndex > 0) {
        shuffleQueue.splice(currentIndex, 1);
        shuffleQueue.unshift(currentTrackIndex);
    }

    console.log('Shuffle queue generated:', shuffleQueue);
}

function getNextShuffleTrack() {
    // Add current to history
    if (!shuffleHistory.includes(currentTrackIndex)) {
        shuffleHistory.push(currentTrackIndex);
    }

    // Generate new queue if empty
    if (shuffleQueue.length === 0) {
        generateShuffleQueue();
        shuffleHistory = []; // Reset history on new queue
    }

    // Get next from queue
    let nextIndex = shuffleQueue.shift();

    // Avoid immediate repeat of current track
    if (nextIndex === currentTrackIndex && shuffleQueue.length > 0) {
        shuffleQueue.push(nextIndex); // Move to end
        nextIndex = shuffleQueue.shift();
    }

    return nextIndex;
}

function getPreviousShuffleTrack() {
    // Go back in history if available
    if (shuffleHistory.length > 1) {
        shuffleHistory.pop(); // Remove current
        const prevIndex = shuffleHistory[shuffleHistory.length - 1];
        shuffleQueue.unshift(currentTrackIndex); // Put current back in queue
        return prevIndex;
    }

    // No history, just return a random track
    return Math.floor(Math.random() * playlist.length);
}

function playTrack(index, preservePlayState = false) {
    if (!player || !playerReady) {
        console.warn('Player not ready yet');
        return;
    }

    // Preserve current play state if requested
    if (preservePlayState) {
        wasPlayingBeforeChange = isPlaying;
    }

    // Stop looper when changing tracks (it will restart when new track plays)
    stopLooper();

    // Detect if we're in an in-app browser
    const isInAppBrowser = /Instagram|FBAN|FBAV|Twitter|LinkedIn/i.test(navigator.userAgent);

    // Fade out before track change if currently playing
    if (isPlaying && currentVolume > 0) {
        fadeVolume(0, 300);
        setTimeout(() => {
            currentTrackIndex = index;
            player.loadVideoById(playlist[index].id);

            // Only autoplay if preserving state and was playing, or if not preserving state
            if (!preservePlayState || wasPlayingBeforeChange) {
                // For in-app browsers, add extra delay to ensure video is loaded
                const playDelay = isInAppBrowser ? 400 : 100;
                setTimeout(() => {
                    player.playVideo();
                    // Fade back in after play starts
                    if (!isInAppBrowser) {
                        setTimeout(() => fadeVolume(currentVolume, 400), 200);
                    } else {
                        fadeVolume(currentVolume, 400);
                    }
                }, playDelay);
            }

            updateCurrentTrack();
        }, 350);
    } else {
        // No fade needed if not playing or volume is 0
        currentTrackIndex = index;
        player.loadVideoById(playlist[index].id);

        // Only autoplay if preserving state and was playing, or if not preserving state
        if (!preservePlayState || wasPlayingBeforeChange) {
            // For in-app browsers, add extra delay to ensure video is loaded
            const playDelay = isInAppBrowser ? 400 : 100;
            setTimeout(() => player.playVideo(), playDelay);
        }

        updateCurrentTrack();
    }
}

function togglePlayPause() {
    if (!player || !playerReady) {
        debugLog('⚠️ Player not ready!');
        return;
    }

    debugLog('▶️ Play button tapped, isPlaying: ' + isPlaying);

    // Add loading state briefly for visual feedback
    DOM.playPauseBtn.classList.add('loading');

    try {
        if (isPlaying) {
            debugLog('⏸ Pausing video...');
            player.pauseVideo();
            // Remove loading state after brief delay
            setTimeout(() => DOM.playPauseBtn.classList.remove('loading'), 150);
        } else {
            // For Instagram and other in-app browsers, ensure we're calling playVideo directly
            // This handles the user gesture requirement
            const playerState = player.getPlayerState();
            const stateNames = {'-1': 'UNSTARTED', '0': 'ENDED', '1': 'PLAYING', '2': 'PAUSED', '3': 'BUFFERING', '5': 'CUED'};
            debugLog('Player state: ' + playerState + ' (' + (stateNames[playerState] || 'UNKNOWN') + ')');

            // Detect in-app browser
            const isInAppBrowser = /Instagram|FBAN|FBAV|Twitter|LinkedIn/i.test(navigator.userAgent);

            if (isInAppBrowser) {
                // Instagram browser workaround: play muted (Instagram allows muted playback)
                debugLog('🔧 Instagram mode: playing muted');

                // Step 1: Mute the player
                debugLog('Step 1: Muting player...');
                player.mute();
                player.setVolume(0);

                // Step 2: Load video
                setTimeout(() => {
                    debugLog('Step 2: Loading video...');
                    player.loadVideoById({
                        videoId: playlist[currentTrackIndex].id,
                        startSeconds: 0
                    });
                }, 100);

                // Step 3: Play the muted video
                setTimeout(() => {
                    debugLog('Step 3: Playing muted...');
                    player.playVideo();
                }, 600);

                // Step 4: Verify playback and enable auto-restart
                setTimeout(() => {
                    const currentState = player.getPlayerState();
                    debugLog('Step 4: State = ' + (stateNames[currentState] || currentState));

                    if (currentState === YT.PlayerState.PLAYING || currentState === YT.PlayerState.BUFFERING) {
                        debugLog('✅ Playing muted!');

                        // Enable Instagram auto-restart
                        instagramAutoRestart = true;
                        restartAttempts = 0;
                        debugLog('🔄 Auto-restart enabled for Instagram');

                        // Show notification about muted playback with YouTube option
                        showNotification('🔇 Playing muted due to Instagram restrictions', 4000);

                        // Add "Open on YouTube" button
                        addYouTubeButton();

                        // Update volume slider to show muted state
                        DOM.volumeSlider.value = 0;
                        updateVolumeIcon(0);
                        currentVolume = 0;

                        debugLog('ℹ️ YouTube button added for audio playback');
                    } else {
                        debugLog('❌ Still not playing. State: ' + currentState);
                        debugLog('Opening on YouTube instead...');

                        // If it still fails, open on YouTube
                        window.open(`https://www.youtube.com/watch?v=${playlist[currentTrackIndex].id}`, '_blank');
                        showNotification('Opening on YouTube...', 2000);
                    }
                    DOM.playPauseBtn.classList.remove('loading');
                }, 1500);

            } else {
                // Regular browser - simple play
                debugLog('▶️ Regular play attempt...');
                player.playVideo();

                setTimeout(() => {
                    const newState = player.getPlayerState();
                    debugLog('State after play: ' + newState + ' (' + (stateNames[newState] || 'UNKNOWN') + ')');

                    if (newState === YT.PlayerState.PLAYING || newState === YT.PlayerState.BUFFERING) {
                        debugLog('✅ Playback started successfully!');
                    }
                    DOM.playPauseBtn.classList.remove('loading');
                }, 800);
            }
        }
    } catch (error) {
        debugLog('❌ ERROR: ' + error.message);
        DOM.playPauseBtn.classList.remove('loading');
    }
}

function playPrevious() {
    let nextIndex;

    if (isShuffle) {
        nextIndex = getPreviousShuffleTrack();
    } else {
        nextIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    }

    // Track skip event
    if (window.Analytics && playlist[nextIndex]) {
        Analytics.trackSkip('previous', playlist[nextIndex].title);
    }

    playTrack(nextIndex, true); // Preserve play state
}

function playNext() {
    let nextIndex;

    if (isShuffle) {
        nextIndex = getNextShuffleTrack();
    } else {
        nextIndex = (currentTrackIndex + 1) % playlist.length;
    }

    // Track skip event
    if (window.Analytics && playlist[nextIndex]) {
        Analytics.trackSkip('next', playlist[nextIndex].title);
    }

    playTrack(nextIndex, true); // Preserve play state
}

function handleTrackEnd() {
    if (repeatMode === 'one') {
        player.seekTo(0);
        player.playVideo();
    } else if (repeatMode === 'all' || currentTrackIndex < playlist.length - 1) {
        playNext();
    } else {
        isPlaying = false;
        updatePlayPauseUI();
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    DOM.shuffleBtn.classList.toggle('active', isShuffle);
    DOM.shuffleBtn.title = isShuffle ? 'Shuffle On' : 'Shuffle Off';

    // Track shuffle toggle
    if (window.Analytics) {
        Analytics.trackShuffle(isShuffle);
    }

    // Generate shuffle queue when enabling shuffle
    if (isShuffle) {
        generateShuffleQueue();
        showNotification('🔀 Shuffle: ON');
    } else {
        // Clear shuffle state when disabling
        shuffleQueue = [];
        shuffleHistory = [];
        showNotification('🔀 Shuffle: OFF');
    }
}

function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const config = {
        off: { title: 'Repeat Off', notification: '🔁 Repeat: OFF' },
        all: { title: 'Repeat All', notification: '🔁 Repeat: ALL' },
        one: { title: 'Repeat One', notification: '🔁 Repeat: ONE' }
    };

    repeatMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    DOM.repeatBtn.classList.toggle('active', repeatMode !== 'off');
    DOM.repeatBtn.title = config[repeatMode].title;

    window.Analytics?.trackRepeat(repeatMode);
    showNotification(config[repeatMode].notification);
}

// ========== DJ LOOPER ==========

function calculateBarDuration(fraction) {
    // Calculate duration of one bar at given BPM (4 beats per bar)
    const secondsPerBeat = 60 / BPM;
    const secondsPerBar = secondsPerBeat * 4;

    // fraction is like '1/32', '1/16', etc.
    const denominator = parseInt(fraction.split('/')[1]);
    return (secondsPerBar / denominator) * 4; // *4 because we're measuring in bars not beats
}

function startLooper() {
    if (!player || !playerReady) return;

    stopLooper(); // Clear any existing loop

    if (looperMode === 'off') return;

    // Capture loop start point ONLY ONCE when activated
    loopStartTime = player.getCurrentTime();
    loopDuration = calculateBarDuration(looperMode);

    // Fix the loop endpoints - these will NOT change
    const fixedLoopEnd = loopStartTime + loopDuration;

    console.log(`Loop fixed: ${loopStartTime.toFixed(3)}s to ${fixedLoopEnd.toFixed(3)}s (${looperMode} bar = ${loopDuration.toFixed(3)}s)`);

    // Check loop every 50ms for good precision with better performance
    looperInterval = setInterval(() => {
        if (!player || !playerReady) return;

        const currentTime = player.getCurrentTime();

        // Use the FIXED loop end point to prevent drift
        if (currentTime >= fixedLoopEnd) {
            player.seekTo(loopStartTime, true);
            console.log(`Looped back to ${loopStartTime.toFixed(3)}s`);
        }
    }, 50); // Balanced between precision and performance
}

function stopLooper() {
    if (looperInterval) {
        clearInterval(looperInterval);
        looperInterval = null;
    }
}

function toggleLooper() {
    const modes = ['off', '1/64', '1/32', '1/16', '1/8', '1/4'];
    const currentIndex = modes.indexOf(looperMode);
    looperMode = modes[(currentIndex + 1) % modes.length];

    DOM.looperBtn.classList.toggle('active', looperMode !== 'off');
    DOM.looperLabel.textContent = looperMode === 'off' ? 'OFF' : looperMode;

    // Track looper toggle
    if (window.Analytics) {
        Analytics.trackLooper(looperMode);
    }

    const titles = {
        'off': 'Looper Off',
        '1/64': 'Loop 1/64 Bar',
        '1/32': 'Loop 1/32 Bar',
        '1/16': 'Loop 1/16 Bar',
        '1/8': 'Loop 1/8 Bar',
        '1/4': 'Loop 1/4 Bar'
    };
    const notifications = {
        'off': '🔄 Looper: OFF',
        '1/64': '🔄 Looper: 1/64 Bar',
        '1/32': '🔄 Looper: 1/32 Bar',
        '1/16': '🔄 Looper: 1/16 Bar',
        '1/8': '🔄 Looper: 1/8 Bar',
        '1/4': '🔄 Looper: 1/4 Bar'
    };

    DOM.looperBtn.title = titles[looperMode];
    showNotification(notifications[looperMode]);

    if (looperMode !== 'off' && isPlaying) {
        startLooper();
    } else {
        stopLooper();
    }
}

// ========== PROGRESS TRACKING ==========

function startProgressTracking() {
    // Always stop any existing interval first to prevent race conditions
    stopProgressTracking();

    progressInterval = setInterval(() => {
        // Safety check: ensure player exists and is ready
        if (player && playerReady && player.getCurrentTime && player.getDuration) {
            try {
                const current = player.getCurrentTime();
                const duration = player.getDuration();

                // Only update if values are valid
                if (isFinite(current) && isFinite(duration) && duration > 0) {
                    updateProgress(current, duration);
                }
            } catch (error) {
                console.error('Progress tracking error:', error);
                stopProgressTracking();
            }
        }
    }, 250); // Reduced from 100ms to 250ms for better performance
}

function stopProgressTracking() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgress(current, duration) {
    const percentage = (current / duration) * 100;
    DOM.progressFill.style.width = `${percentage}%`;
    DOM.currentTime.textContent = formatTime(Math.floor(current));
}

// Scrubbing state
let isScrubbing = false;
let wasPlayingBeforeScrub = false;

function seekTo(event) {
    const rect = DOM.progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const duration = player.getDuration();
    const seekTime = duration * percentage;
    player.seekTo(seekTime, true);

    // If looper is active, restart the loop from new position
    if (looperMode !== 'off' && isPlaying) {
        startLooper();
    }
}

function startScrubbing(event) {
    if (!player || !playerReady) return;

    isScrubbing = true;
    wasPlayingBeforeScrub = isPlaying;

    // Pause during scrubbing for better performance
    if (isPlaying) {
        player.pauseVideo();
    }

    // Stop looper while scrubbing
    stopLooper();

    // Seek to initial position
    seekTo(event);

    // Add document-level listeners for smooth dragging
    document.addEventListener('mousemove', onScrubMove);
    document.addEventListener('mouseup', stopScrubbing);
}

function onScrubMove(event) {
    if (!isScrubbing) return;

    const rect = DOM.progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const duration = player.getDuration();
    const seekTime = duration * percentage;

    // Update progress bar visually
    DOM.progressFill.style.width = `${percentage * 100}%`;
    DOM.currentTime.textContent = formatTime(Math.floor(seekTime));

    // Seek to position
    player.seekTo(seekTime, true);
}

function stopScrubbing() {
    if (!isScrubbing) return;

    isScrubbing = false;

    // Remove document-level listeners
    document.removeEventListener('mousemove', onScrubMove);
    document.removeEventListener('mouseup', stopScrubbing);

    // Resume playback if it was playing before
    if (wasPlayingBeforeScrub) {
        player.playVideo();

        // Restart looper if it was active
        if (looperMode !== 'off') {
            startLooper();
        }
    }
}

// ========== VOLUME CONTROL ==========

function updateVolume(value) {
    currentVolume = value;

    // Detect Instagram browser
    const isInAppBrowser = /Instagram|FBAN|FBAV|Twitter|LinkedIn/i.test(navigator.userAgent);

    if (value > 0 && isInAppBrowser && player.isMuted()) {
        // User is trying to unmute in Instagram browser
        debugLog('🔊 User unmuting: ' + value);
        player.unMute();

        // Wait a moment to see if Instagram blocks it
        setTimeout(() => {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.UNSTARTED) {
                debugLog('⚠️ Instagram blocked unmute, restarting playback...');
                player.playVideo();
            } else {
                debugLog('✅ Unmute successful!');
            }
        }, 300);
    }

    player.setVolume(value);
    localStorage.setItem('playerVolume', value);
    updateVolumeIcon(value);
}

function toggleMute() {
    const isInAppBrowser = /Instagram|FBAN|FBAV|Twitter|LinkedIn/i.test(navigator.userAgent);

    if (currentVolume > 0) {
        // Muting
        debugLog('🔇 Muting...');
        if (window.Analytics) {
            Analytics.trackVolume(0, 'mute');
        }
        updateVolume(0);
        DOM.volumeSlider.value = 0;
    } else {
        // Unmuting
        const savedVolume = parseInt(localStorage.getItem('playerVolume')) || 100;
        debugLog('🔊 Unmuting to: ' + savedVolume);

        if (window.Analytics) {
            Analytics.trackVolume(savedVolume, 'unmute');
        }

        if (isInAppBrowser) {
            // In Instagram, show notification about potential issues
            showNotification('🔊 Unmuting... If playback stops, tap play again.', 3000);
        }

        updateVolume(savedVolume);
        DOM.volumeSlider.value = savedVolume;
    }
}

function updateVolumeIcon(volume) {
    const icon = document.getElementById('volume-icon');
    if (volume === 0) {
        icon.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6m0-6l6 6" stroke="currentColor" stroke-width="2" fill="none"/>';
    } else {
        icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    }
}

// ========== LIKE SYSTEM ==========

function getLikedTracks() {
    if (likedTracksCache === null) {
        likedTracksCache = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    }
    return likedTracksCache;
}

function isTrackLiked(trackId) {
    return getLikedTracks().includes(trackId);
}

function toggleLike(trackId, button) {
    let liked = getLikedTracks();
    const index = liked.indexOf(trackId);
    const isLiked = index === -1;

    if (index > -1) {
        liked.splice(index, 1);
        button.classList.remove('liked');
        button.querySelector('svg').setAttribute('fill', 'none');
    } else {
        liked.push(trackId);
        button.classList.add('liked');
        button.querySelector('svg').setAttribute('fill', 'currentColor');
    }

    // Track like event
    if (window.Analytics) {
        const track = playlist.find(t => t.id === trackId);
        if (track) {
            Analytics.trackLike(track.title, isLiked);
        }
    }

    likedTracksCache = liked; // Update cache
    localStorage.setItem('likedTracks', JSON.stringify(liked));
}

// ========== SHARE FUNCTIONALITY ==========

function toggleShareMenu(index) {
    const menu = shareMenus[index];

    // Close all other menus using cached elements
    shareMenus.forEach(m => {
        if (m !== menu) m.classList.remove('active');
    });

    menu.classList.toggle('active');
}

function shareTrack(platform, videoId, title = '') {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Track share event
    if (window.Analytics) {
        const decodedTitle = decodeURIComponent(title);
        Analytics.trackShare(decodedTitle, platform);
    }

    switch (platform) {
        case 'youtube':
            window.open(youtubeUrl, '_blank');
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(youtubeUrl)}`, '_blank');
            break;
        case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(youtubeUrl)}`, '_blank');
            break;
    }

    // Close all share menus using cached elements
    shareMenus.forEach(m => m.classList.remove('active'));
}

function copyTrackLink(videoId, index) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Track copy link event
    if (window.Analytics) {
        const track = playlist.find(t => t.id === videoId);
        if (track) {
            Analytics.trackShare(track.title, 'copy_link');
        }
    }

    // Try modern clipboard API first, fallback to older methods
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showCopySuccess(index);
        }).catch(() => {
            fallbackCopyToClipboard(url, index);
        });
    } else {
        fallbackCopyToClipboard(url, index);
    }
}

// Fallback clipboard copy for older browsers
function fallbackCopyToClipboard(text, index) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showCopySuccess(index);
    } catch (err) {
        console.error('Failed to copy:', err);
        showNotification('❌ Copy failed');
    }

    document.body.removeChild(textArea);
}

function showCopySuccess(index) {
    const menu = shareMenus[index];
    const copyOption = menu.querySelector('.share-option:last-child span');
    const originalText = copyOption.textContent;

    copyOption.textContent = 'Copied!';
    setTimeout(() => {
        copyOption.textContent = originalText;
        menu.classList.remove('active');
    }, 1500);
}

// ========== UTILITY FUNCTIONS ==========

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function formatViews(views) {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
}

// ========== EVENT LISTENERS ==========

// Enhanced event listeners for better mobile/in-app browser support
// Using both 'click' and 'touchend' to ensure compatibility
function addUniversalClickListener(element, handler) {
    // Prevent double-firing on devices that support both touch and click
    let touchHandled = false;

    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchHandled = true;
        handler();
        setTimeout(() => { touchHandled = false; }, 300);
    });

    element.addEventListener('click', (e) => {
        if (!touchHandled) {
            handler();
        }
    });
}

// Control buttons with universal click handling
addUniversalClickListener(DOM.playPauseBtn, togglePlayPause);
addUniversalClickListener(DOM.prevBtn, playPrevious);
addUniversalClickListener(DOM.nextBtn, playNext);
addUniversalClickListener(DOM.shuffleBtn, toggleShuffle);
addUniversalClickListener(DOM.repeatBtn, toggleRepeat);
addUniversalClickListener(DOM.looperBtn, toggleLooper);

// Progress bar scrubbing
DOM.progressBar.addEventListener('mousedown', startScrubbing);

// Volume controls
DOM.volumeSlider.addEventListener('input', (e) => updateVolume(parseInt(e.target.value)));
addUniversalClickListener(DOM.volumeBtn, toggleMute);

// Close share menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.share-dropdown')) {
        shareMenus.forEach(m => m.classList.remove('active'));
    }
});

// ========== NOTIFICATION SYSTEM ==========

let notificationTimeout;

function showNotification(message, duration = 2000) {
    if (notificationTimeout) clearTimeout(notificationTimeout);

    DOM.notificationToast.textContent = message;
    DOM.notificationToast.classList.add('show');

    notificationTimeout = setTimeout(() => {
        DOM.notificationToast.classList.remove('show');
    }, duration);
}

// ========== INSTAGRAM YOUTUBE BUTTON ==========

function addYouTubeButton() {
    // Check if button already exists
    if (document.getElementById('instagram-youtube-btn')) return;

    const button = document.createElement('button');
    button.id = 'instagram-youtube-btn';
    button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        🔊 Listen with Sound on YouTube
    `;
    button.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
        color: white;
        border: none;
        padding: 16px 24px;
        border-radius: 30px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(255, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }
        #instagram-youtube-btn:active {
            transform: translateX(-50%) scale(0.95) !important;
        }
    `;
    document.head.appendChild(style);

    button.onclick = () => {
        const track = playlist[currentTrackIndex];
        debugLog('🎵 Opening on YouTube: ' + track.title);
        window.open(`https://www.youtube.com/watch?v=${track.id}`, '_blank');

        // Track analytics
        if (window.Analytics) {
            Analytics.trackShare(track.title, 'youtube_button_instagram');
        }
    };

    document.body.appendChild(button);
    debugLog('✅ YouTube button added');
}

// ========== DEBUG SYSTEM FOR MOBILE ==========

function debugLog(message) {
    console.log(message);
    if (DEBUG_MODE) {
        const timestamp = new Date().toLocaleTimeString();
        debugLogs.push(`[${timestamp}] ${message}`);

        // Keep only last 20 logs
        if (debugLogs.length > 20) {
            debugLogs.shift();
        }

        updateDebugPanel();
    }
}

function updateDebugPanel() {
    let panel = document.getElementById('debug-panel');

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            max-height: 200px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: monospace;
            font-size: 10px;
            padding: 10px;
            border: 1px solid #0f0;
            border-radius: 5px;
            z-index: 10000;
            line-height: 1.4;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: #f00;
            color: #fff;
            border: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            line-height: 1;
        `;
        closeBtn.onclick = () => panel.remove();
        panel.appendChild(closeBtn);

        const title = document.createElement('div');
        title.textContent = '🐛 DEBUG MODE (Instagram Browser)';
        title.style.cssText = 'font-weight: bold; margin-bottom: 10px; padding-right: 30px;';
        panel.appendChild(title);

        const logContainer = document.createElement('div');
        logContainer.id = 'debug-logs';
        panel.appendChild(logContainer);

        document.body.appendChild(panel);
    }

    const logContainer = document.getElementById('debug-logs');
    logContainer.innerHTML = debugLogs.join('<br>');

    // Auto-scroll to bottom
    panel.scrollTop = panel.scrollHeight;
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields or textareas
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );

    if (isTyping) return;

    // Don't handle shortcuts if player isn't ready
    if (!playerReady && e.key !== ' ' && !e.key.startsWith('Arrow')) {
        return;
    }

    const handled = true;

    switch(e.key) {
        case ' ':
            e.preventDefault();
            togglePlayPause();
            break;

        // Seek backward (5 seconds)
        case 'ArrowLeft':
        case 'j':
        case 'J':
            e.preventDefault();
            if (player && playerReady && player.getCurrentTime) {
                const newTime = Math.max(0, player.getCurrentTime() - 5);
                player.seekTo(newTime);
            }
            break;

        // Seek forward (5 seconds)
        case 'ArrowRight':
        case 'l':
        case 'L':
            e.preventDefault();
            if (player && playerReady && player.getCurrentTime && player.getDuration) {
                const newTime = Math.min(player.getDuration(), player.getCurrentTime() + 5);
                player.seekTo(newTime);
            }
            break;

        // Volume up
        case 'ArrowUp':
            e.preventDefault();
            DOM.volumeSlider.value = Math.min(100, parseInt(DOM.volumeSlider.value) + 10);
            updateVolume(parseInt(DOM.volumeSlider.value));
            break;

        // Volume down
        case 'ArrowDown':
            e.preventDefault();
            DOM.volumeSlider.value = Math.max(0, parseInt(DOM.volumeSlider.value) - 10);
            updateVolume(parseInt(DOM.volumeSlider.value));
            break;

        // Mute/Unmute
        case 'm':
        case 'M':
            e.preventDefault();
            toggleMute();
            break;

        // Next track
        case 'n':
        case 'N':
            e.preventDefault();
            playNext();
            break;

        // Previous track
        case 'p':
        case 'P':
            e.preventDefault();
            playPrevious();
            break;

        // Toggle shuffle
        case 's':
        case 'S':
            e.preventDefault();
            toggleShuffle();
            break;

        // Toggle repeat
        case 'r':
        case 'R':
            e.preventDefault();
            toggleRepeat();
            break;

        // Toggle looper
        case 'o':
        case 'O':
            e.preventDefault();
            toggleLooper();
            break;

        // Number keys (0-9) for volume percentage
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            e.preventDefault();
            const volumePercent = parseInt(e.key) * 10;
            DOM.volumeSlider.value = volumePercent;
            updateVolume(volumePercent);
            showNotification(`🔊 Volume: ${volumePercent}%`, 1000);
            break;

        // Skip to beginning (Home key)
        case 'Home':
            e.preventDefault();
            if (player && playerReady) {
                player.seekTo(0);
            }
            break;

        // Skip to end (End key) - useful for testing track end behavior
        case 'End':
            e.preventDefault();
            if (player && playerReady && player.getDuration) {
                player.seekTo(player.getDuration() - 1);
            }
            break;
    }
});

// Load saved volume
const savedVolume = parseInt(localStorage.getItem('playerVolume'));
if (savedVolume !== null) {
    currentVolume = savedVolume;
    DOM.volumeSlider.value = savedVolume;
}

// ========== EXPOSE CACHE MANAGEMENT FOR DEBUGGING ==========
// Usage in browser console:
// - MusicPlayer.refreshCache() - Clear cache and reload playlist
// - MusicPlayer.clearCache() - Just clear the cache
// - MusicPlayer.getCacheInfo() - Get cache status

window.MusicPlayer = {
    refreshCache: function() {
        clearPlaylistCache();
        location.reload();
    },
    clearCache: function() {
        clearPlaylistCache();
        console.log('Cache cleared. Reload page to fetch fresh data.');
    },
    getCacheInfo: function() {
        const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (!cacheTimestamp) {
            console.log('No cache found');
            return { cached: false };
        }
        const timestamp = parseInt(cacheTimestamp);
        const age = Date.now() - timestamp;
        const ageHours = (age / (1000 * 60 * 60)).toFixed(2);
        const ageMinutes = (age / (1000 * 60)).toFixed(0);
        const expiresIn = CACHE_DURATION - age;
        const expiresInHours = (expiresIn / (1000 * 60 * 60)).toFixed(2);

        console.log(`Cache age: ${ageHours} hours (${ageMinutes} minutes)`);
        console.log(`Expires in: ${expiresInHours} hours`);
        console.log(`Cache valid: ${expiresIn > 0}`);

        return {
            cached: true,
            ageMs: age,
            ageHours: parseFloat(ageHours),
            expiresInHours: parseFloat(expiresInHours),
            valid: expiresIn > 0
        };
    }
};

// ========== CLEANUP ON PAGE UNLOAD ==========
function cleanupAllIntervals() {
    stopProgressTracking();
    stopLooper();
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
}

// Clean up resources when page unloads
window.addEventListener('beforeunload', cleanupAllIntervals);
window.addEventListener('pagehide', cleanupAllIntervals); // For mobile Safari

// Initialize if YouTube API is already loaded
if (window.YT && window.YT.Player) {
    fetchTracks();
}
