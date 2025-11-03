// ========== GOOGLE ANALYTICS 4 - CUSTOM EVENT TRACKING ==========
//
// This file provides a wrapper for GA4 event tracking with fallback
// and debug logging. It tracks music player interactions, social clicks,
// and user engagement metrics.
//
// Events are sent to GA4 asynchronously and don't block user interactions.

// Check if gtag is available (GA4 loaded)
function isGtagAvailable() {
    return typeof gtag !== 'undefined' && typeof window.dataLayer !== 'undefined';
}

// Debug mode - set to true to log events to console
const ANALYTICS_DEBUG = true; // Enable debug mode to see what's happening

// Wait for gtag to load
let gtagLoadAttempts = 0;
const maxGtagLoadAttempts = 50; // Wait up to 5 seconds

function waitForGtag(callback) {
    if (isGtagAvailable()) {
        callback();
        return;
    }

    gtagLoadAttempts++;
    if (gtagLoadAttempts < maxGtagLoadAttempts) {
        setTimeout(() => waitForGtag(callback), 100);
    } else {
        console.warn('⚠️ GA4 (gtag) failed to load after 5 seconds. Analytics disabled.');
        console.warn('Possible causes: Ad blocker, network issue, or incorrect Measurement ID');
    }
}

// ========== CORE EVENT TRACKING FUNCTION ==========

/**
 * Send custom event to Google Analytics 4
 * @param {string} eventName - Name of the event (e.g., 'track_play')
 * @param {object} eventParams - Additional parameters for the event
 */
function trackEvent(eventName, eventParams = {}) {
    if (!isGtagAvailable()) {
        if (ANALYTICS_DEBUG) {
            console.warn('GA4 not loaded, event not sent:', eventName, eventParams);
        }
        return;
    }

    try {
        gtag('event', eventName, eventParams);

        if (ANALYTICS_DEBUG) {
            console.log('📊 GA4 Event:', eventName, eventParams);
        }
    } catch (error) {
        console.error('Error sending GA4 event:', error);
    }
}

// ========== MUSIC PLAYER EVENTS ==========

/**
 * Track when a track starts playing
 * @param {string} trackTitle - Title of the track
 * @param {number} trackIndex - Position in playlist (0-based)
 * @param {number} trackDuration - Duration in seconds
 */
function trackPlay(trackTitle, trackIndex, trackDuration) {
    trackEvent('track_play', {
        track_title: trackTitle,
        track_position: trackIndex + 1,
        track_duration: trackDuration,
        engagement_time_msec: 100
    });
}

/**
 * Track when a track is paused
 * @param {string} trackTitle - Title of the track
 * @param {number} currentTime - Time when paused (seconds)
 * @param {number} duration - Total track duration
 */
function trackPause(trackTitle, currentTime, duration) {
    const listenPercentage = Math.round((currentTime / duration) * 100);

    trackEvent('track_pause', {
        track_title: trackTitle,
        listen_percentage: listenPercentage,
        listen_duration: Math.round(currentTime)
    });
}

/**
 * Track when a track is completed (>90% listened)
 * @param {string} trackTitle - Title of the track
 * @param {number} trackDuration - Duration in seconds
 */
function trackComplete(trackTitle, trackDuration) {
    trackEvent('track_complete', {
        track_title: trackTitle,
        track_duration: trackDuration
    });
}

/**
 * Track when a user likes a track
 * @param {string} trackTitle - Title of the track
 * @param {boolean} isLiked - True if liked, false if unliked
 */
function trackLike(trackTitle, isLiked) {
    trackEvent('track_like', {
        track_title: trackTitle,
        action: isLiked ? 'like' : 'unlike'
    });
}

/**
 * Track when a user shares a track
 * @param {string} trackTitle - Title of the track
 * @param {string} platform - Share platform (youtube, twitter, facebook, copy_link)
 */
function trackShare(trackTitle, platform) {
    trackEvent('track_share', {
        track_title: trackTitle,
        share_platform: platform
    });
}

/**
 * Track when shuffle is toggled
 * @param {boolean} isEnabled - True if shuffle on, false if off
 */
function trackShuffle(isEnabled) {
    trackEvent('player_shuffle', {
        action: isEnabled ? 'on' : 'off'
    });
}

/**
 * Track when repeat mode changes
 * @param {string} mode - Repeat mode: 'off', 'all', 'one'
 */
function trackRepeat(mode) {
    trackEvent('player_repeat', {
        repeat_mode: mode
    });
}

/**
 * Track DJ looper usage
 * @param {string} mode - Looper mode: 'off', '1/64', '1/32', '1/16', '1/8', '1/4'
 */
function trackLooper(mode) {
    trackEvent('player_looper', {
        looper_mode: mode,
        action: mode === 'off' ? 'off' : 'on'
    });
}

/**
 * Track volume changes
 * @param {number} volume - Volume level (0-100)
 * @param {string} action - 'increase', 'decrease', 'mute', 'unmute'
 */
function trackVolume(volume, action) {
    trackEvent('player_volume', {
        volume_level: volume,
        action: action
    });
}

/**
 * Track when user skips to next/previous track
 * @param {string} direction - 'next' or 'previous'
 * @param {string} trackTitle - Title of the new track
 */
function trackSkip(direction, trackTitle) {
    trackEvent('track_skip', {
        direction: direction,
        track_title: trackTitle
    });
}

// ========== SOCIAL MEDIA & EXTERNAL LINK TRACKING ==========

/**
 * Track social media link clicks
 * @param {string} platform - Platform name (instagram, youtube, spotify, etc.)
 * @param {string} url - URL clicked
 * @param {string} location - Where on page (hero, footer, contact)
 */
function trackSocialClick(platform, url, location = 'unknown') {
    trackEvent('social_click', {
        platform: platform,
        link_url: url,
        link_location: location
    });
}

/**
 * Track email contact clicks
 */
function trackEmailClick() {
    trackEvent('contact_email', {
        method: 'email'
    });
}

// ========== NAVIGATION & ENGAGEMENT TRACKING ==========

/**
 * Track navigation menu clicks
 * @param {string} sectionName - Name of section (home, about, services, contact)
 */
function trackNavigation(sectionName) {
    trackEvent('navigation_click', {
        section: sectionName
    });
}

/**
 * Track scroll depth milestones
 * @param {number} percentage - Scroll depth percentage (25, 50, 75, 100)
 */
function trackScrollDepth(percentage) {
    trackEvent('scroll_depth', {
        depth_percentage: percentage
    });
}

/**
 * Track session engagement milestones
 * @param {number} minutes - Minutes spent on site (1, 3, 5, 10)
 */
function trackEngagementTime(minutes) {
    trackEvent('engagement_milestone', {
        time_minutes: minutes
    });
}

// ========== CACHE & PERFORMANCE TRACKING ==========

/**
 * Track cache hits vs API calls
 * @param {boolean} isCacheHit - True if loaded from cache
 */
function trackPlaylistLoad(isCacheHit) {
    trackEvent('playlist_load', {
        load_source: isCacheHit ? 'cache' : 'api',
        cache_hit: isCacheHit
    });
}

/**
 * Track playlist load errors
 * @param {string} errorMessage - Error message
 */
function trackPlaylistError(errorMessage) {
    trackEvent('playlist_error', {
        error_message: errorMessage
    });
}

// ========== AUTO-TRACKING SETUP ==========

// Track scroll depth automatically
let scrollDepthTracked = {
    25: false,
    50: false,
    75: false,
    100: false
};

function initScrollTracking() {
    window.addEventListener('scroll', () => {
        const scrollPercentage = Math.round(
            ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
        );

        // Track milestones
        [25, 50, 75, 100].forEach(milestone => {
            if (scrollPercentage >= milestone && !scrollDepthTracked[milestone]) {
                scrollDepthTracked[milestone] = true;
                trackScrollDepth(milestone);
            }
        });
    });
}

// Track engagement time automatically
let engagementTimeTracked = {
    1: false,
    3: false,
    5: false,
    10: false
};

function initEngagementTracking() {
    const startTime = Date.now();

    setInterval(() => {
        const minutesElapsed = Math.floor((Date.now() - startTime) / 60000);

        [1, 3, 5, 10].forEach(milestone => {
            if (minutesElapsed >= milestone && !engagementTimeTracked[milestone]) {
                engagementTimeTracked[milestone] = true;
                trackEngagementTime(milestone);
            }
        });
    }, 30000); // Check every 30 seconds
}

// Initialize auto-tracking when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        waitForGtag(() => {
            console.log('✅ GA4 (gtag) loaded successfully!');
            initScrollTracking();
            initEngagementTracking();
        });
    });
} else {
    waitForGtag(() => {
        console.log('✅ GA4 (gtag) loaded successfully!');
        initScrollTracking();
        initEngagementTracking();
    });
}

// ========== EXPOSE ANALYTICS FUNCTIONS GLOBALLY ==========

window.Analytics = {
    // Music Player
    trackPlay,
    trackPause,
    trackComplete,
    trackLike,
    trackShare,
    trackShuffle,
    trackRepeat,
    trackLooper,
    trackVolume,
    trackSkip,

    // Social & External
    trackSocialClick,
    trackEmailClick,

    // Navigation
    trackNavigation,
    trackScrollDepth,
    trackEngagementTime,

    // Cache & Performance
    trackPlaylistLoad,
    trackPlaylistError,

    // Raw event tracking
    trackEvent,

    // Debug helpers
    isGtagAvailable,
    waitForGtag
};

// Log initialization status with delay check
waitForGtag(() => {
    console.log('📊 Analytics initialized - GA4 tracking active');
    console.log('Measurement ID: G-R3FYSJ1TQ7');
    console.log('Test with: Analytics.trackEvent("test_event", {test: "works"})');
});
