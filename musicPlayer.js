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
let repeatMode = 'off'; // 'off', 'all', 'one'
let currentVolume = 100;
let progressInterval;
let shuffleQueue = [];
let shuffleHistory = [];
let wasPlayingBeforeChange = false;
let playerReady = false;

// DJ Looper state
let looperMode = 'off'; // 'off', '1/64', '1/32', '1/16', '1/8', '1/4'
let looperInterval;
let loopStartTime = 0;
let loopDuration = 0;
const BPM = 120; // Default BPM, can be adjusted

// DOM Elements
const loadingState = document.getElementById('loading-state');
const musicPlayer = document.getElementById('music-player');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');

const albumArt = document.getElementById('current-album-art');
const playingIndicator = document.getElementById('playing-indicator');
const trackTitle = document.getElementById('current-track-title');
const trackArtist = document.getElementById('current-track-artist');
const trackMeta = document.getElementById('current-track-meta');

const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');
const looperBtn = document.getElementById('looper-btn');
const looperLabel = document.querySelector('.looper-label');

const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const currentTime = document.getElementById('current-time');
const durationTime = document.getElementById('duration-time');

const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');

const tracklistContainer = document.getElementById('tracklist');
const trackCount = document.getElementById('track-count');

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

// ========== FETCH TRACKS FROM YOUTUBE PLAYLIST ==========

async function fetchTracks() {
    try {
        // Check cache first
        const cachedPlaylist = getCachedPlaylist();

        if (cachedPlaylist && cachedPlaylist.length > 0) {
            playlist = cachedPlaylist;
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
            const thumbnailUrl = 'albumart.png';

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

        initializePlayer();
        renderTracklist();
        hideLoading();

    } catch (error) {
        console.error('Error fetching tracks:', error);

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
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: playlist[0].id,
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'rel': 0,
            'showinfo': 0,
            'modestbranding': 1
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
    console.log('YouTube player ready');
}

function onPlayerStateChange(event) {
    console.log('Player state changed:', event.data);

    // Remove loading state when player responds
    playPauseBtn.classList.remove('loading');

    switch(event.data) {
        case YT.PlayerState.ENDED:
            isPlaying = false;
            isBuffering = false;
            handleTrackEnd();
            break;

        case YT.PlayerState.PLAYING:
            isPlaying = true;
            isBuffering = false;
            updatePlayPauseUI();
            startProgressTracking();
            // Start looper if it's enabled
            if (looperMode !== 'off') {
                startLooper();
            }
            break;

        case YT.PlayerState.PAUSED:
            isPlaying = false;
            isBuffering = false;
            updatePlayPauseUI();
            stopProgressTracking();
            // Stop looper when paused
            stopLooper();
            break;

        case YT.PlayerState.BUFFERING:
            isBuffering = true;
            playPauseBtn.classList.add('loading');
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
    playPauseBtn.classList.remove('loading');

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

    // Auto-skip to next track if video unavailable
    if ([100, 101, 150].includes(event.data)) {
        console.log('Auto-skipping unavailable video...');
        setTimeout(() => {
            if (currentTrackIndex < playlist.length - 1 || repeatMode === 'all') {
                playNext();
            }
        }, 1000);
    }
}

// ========== UI UPDATES ==========

function hideLoading() {
    loadingState.style.display = 'none';
    musicPlayer.style.display = 'grid';
}

function showError(message) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    errorMessage.textContent = message;
}

function updateCurrentTrack() {
    const track = playlist[currentTrackIndex];

    trackTitle.textContent = track.title;
    trackArtist.textContent = 'Monolit Beatz';
    trackMeta.textContent = `${formatDate(track.publishedAt)} • ${formatViews(track.views)} views`;
    albumArt.src = track.thumbnail;
    durationTime.textContent = formatTime(track.duration);

    // Update active state in tracklist
    document.querySelectorAll('.track-item').forEach((item, index) => {
        item.classList.toggle('active', index === currentTrackIndex);
    });
}

function updatePlayPauseUI() {
    if (isPlaying) {
        playIcon.style.opacity = '0';
        playIcon.style.transform = 'scale(0.8) rotate(90deg)';
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        // Trigger animation
        setTimeout(() => {
            pauseIcon.style.opacity = '1';
            pauseIcon.style.transform = 'scale(1) rotate(0deg)';
        }, 10);
        playPauseBtn.setAttribute('aria-label', 'Pause');
        albumArt.classList.add('playing');
        playingIndicator.style.display = 'flex';
    } else {
        pauseIcon.style.opacity = '0';
        pauseIcon.style.transform = 'scale(0.8) rotate(-90deg)';
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
        // Trigger animation
        setTimeout(() => {
            playIcon.style.opacity = '1';
            playIcon.style.transform = 'scale(1) rotate(0deg)';
        }, 10);
        pauseIcon.style.display = 'none';
        playPauseBtn.setAttribute('aria-label', 'Play');
        albumArt.classList.remove('playing');
        playingIndicator.style.display = 'none';
    }
}

// ========== TRACKLIST RENDERING ==========

function renderTracklist() {
    tracklistContainer.innerHTML = '';
    trackCount.textContent = `${playlist.length} tracks`;

    playlist.forEach((track, index) => {
        const trackItem = createTrackItem(track, index);
        tracklistContainer.appendChild(trackItem);
    });
}

function createTrackItem(track, index) {
    const div = document.createElement('div');
    div.className = 'track-item';
    div.dataset.index = index;

    const trackNumber = String(index + 1).padStart(2, '0');

    div.innerHTML = `
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

    // Fade out before track change if currently playing
    if (isPlaying && currentVolume > 0) {
        fadeVolume(0, 300);
        setTimeout(() => {
            currentTrackIndex = index;
            player.loadVideoById(playlist[index].id);

            // Only autoplay if preserving state and was playing, or if not preserving state
            if (!preservePlayState || wasPlayingBeforeChange) {
                player.playVideo();
                // Fade back in after track loads
                setTimeout(() => fadeVolume(currentVolume, 400), 200);
            }

            updateCurrentTrack();
        }, 350);
    } else {
        // No fade needed if not playing or volume is 0
        currentTrackIndex = index;
        player.loadVideoById(playlist[index].id);

        // Only autoplay if preserving state and was playing, or if not preserving state
        if (!preservePlayState || wasPlayingBeforeChange) {
            player.playVideo();
        }

        updateCurrentTrack();
    }
}

function togglePlayPause() {
    if (!player || !player.playVideo) return;

    // Add loading state briefly for visual feedback
    playPauseBtn.classList.add('loading');

    if (isPlaying) {
        player.pauseVideo();
        // Remove loading state after brief delay
        setTimeout(() => playPauseBtn.classList.remove('loading'), 150);
    } else {
        player.playVideo();
        // Remove loading state after brief delay
        setTimeout(() => playPauseBtn.classList.remove('loading'), 150);
    }
}

function playPrevious() {
    let nextIndex;

    if (isShuffle) {
        nextIndex = getPreviousShuffleTrack();
    } else {
        nextIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
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
    shuffleBtn.classList.toggle('active', isShuffle);
    shuffleBtn.title = isShuffle ? 'Shuffle On' : 'Shuffle Off';

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
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];

    repeatBtn.classList.toggle('active', repeatMode !== 'off');

    const titles = {
        'off': 'Repeat Off',
        'all': 'Repeat All',
        'one': 'Repeat One'
    };
    const notifications = {
        'off': '🔁 Repeat: OFF',
        'all': '🔁 Repeat: ALL',
        'one': '🔁 Repeat: ONE'
    };
    repeatBtn.title = titles[repeatMode];
    showNotification(notifications[repeatMode]);
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

    // Check loop every 25ms for tighter precision (reduced from 50ms)
    looperInterval = setInterval(() => {
        if (!player || !playerReady) return;

        const currentTime = player.getCurrentTime();

        // Use the FIXED loop end point to prevent drift
        if (currentTime >= fixedLoopEnd) {
            player.seekTo(loopStartTime, true);
            console.log(`Looped back to ${loopStartTime.toFixed(3)}s`);
        }
    }, 25);
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

    looperBtn.classList.toggle('active', looperMode !== 'off');
    looperLabel.textContent = looperMode === 'off' ? 'OFF' : looperMode;

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

    looperBtn.title = titles[looperMode];
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
    }, 100);
}

function stopProgressTracking() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgress(current, duration) {
    const percentage = (current / duration) * 100;
    progressFill.style.width = `${percentage}%`;
    currentTime.textContent = formatTime(Math.floor(current));
}

// Scrubbing state
let isScrubbing = false;
let wasPlayingBeforeScrub = false;

function seekTo(event) {
    const rect = progressBar.getBoundingClientRect();
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

    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const duration = player.getDuration();
    const seekTime = duration * percentage;

    // Update progress bar visually
    progressFill.style.width = `${percentage * 100}%`;
    currentTime.textContent = formatTime(Math.floor(seekTime));

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
    player.setVolume(value);
    localStorage.setItem('playerVolume', value);
    updateVolumeIcon(value);
}

function toggleMute() {
    if (currentVolume > 0) {
        updateVolume(0);
        volumeSlider.value = 0;
    } else {
        const savedVolume = parseInt(localStorage.getItem('playerVolume')) || 100;
        updateVolume(savedVolume);
        volumeSlider.value = savedVolume;
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

function isTrackLiked(trackId) {
    const liked = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    return liked.includes(trackId);
}

function toggleLike(trackId, button) {
    let liked = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    const index = liked.indexOf(trackId);

    if (index > -1) {
        liked.splice(index, 1);
        button.classList.remove('liked');
        button.querySelector('svg').setAttribute('fill', 'none');
    } else {
        liked.push(trackId);
        button.classList.add('liked');
        button.querySelector('svg').setAttribute('fill', 'currentColor');
    }

    localStorage.setItem('likedTracks', JSON.stringify(liked));
}

// ========== SHARE FUNCTIONALITY ==========

function toggleShareMenu(index) {
    const menu = document.getElementById(`share-menu-${index}`);

    // Close all other menus
    document.querySelectorAll('.share-menu').forEach(m => {
        if (m !== menu) m.classList.remove('active');
    });

    menu.classList.toggle('active');
}

function shareTrack(platform, videoId, title = '') {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

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

    // Close all share menus
    document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));
}

function copyTrackLink(videoId, index) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    navigator.clipboard.writeText(url).then(() => {
        const menu = document.getElementById(`share-menu-${index}`);
        const copyOption = menu.querySelector('.share-option:last-child span');
        const originalText = copyOption.textContent;

        copyOption.textContent = 'Copied!';
        setTimeout(() => {
            copyOption.textContent = originalText;
            menu.classList.remove('active');
        }, 1500);
    });
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

playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', playNext);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);
looperBtn.addEventListener('click', toggleLooper);

// Enable scrubbing with mousedown for drag-to-seek functionality
progressBar.addEventListener('mousedown', startScrubbing);

volumeSlider.addEventListener('input', (e) => {
    updateVolume(parseInt(e.target.value));
});

volumeBtn.addEventListener('click', toggleMute);

// Close share menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.share-dropdown')) {
        document.querySelectorAll('.share-menu').forEach(m => m.classList.remove('active'));
    }
});

// ========== NOTIFICATION SYSTEM ==========
const notificationToast = document.getElementById('notification-toast');
let notificationTimeout;

function showNotification(message, duration = 2000) {
    // Clear any existing timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    notificationToast.textContent = message;
    notificationToast.classList.add('show');

    notificationTimeout = setTimeout(() => {
        notificationToast.classList.remove('show');
    }, duration);
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
            volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 10);
            updateVolume(parseInt(volumeSlider.value));
            break;

        // Volume down
        case 'ArrowDown':
            e.preventDefault();
            volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 10);
            updateVolume(parseInt(volumeSlider.value));
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
            volumeSlider.value = volumePercent;
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
    volumeSlider.value = savedVolume;
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

// Initialize if YouTube API is already loaded
if (window.YT && window.YT.Player) {
    fetchTracks();
}
