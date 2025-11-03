# Google Analytics 4 - Implementation Guide

## Overview

Your Monolit Beatz website now has comprehensive Google Analytics 4 tracking installed with custom events for music player interactions, social media clicks, and user engagement.

**Measurement ID:** `G-R3FYSJ1TQ7`

---

## 📊 What Gets Tracked Automatically

### Standard GA4 Metrics (Built-in)
- ✅ Page views
- ✅ User sessions
- ✅ Session duration
- ✅ Bounce rate
- ✅ Traffic sources (Instagram, YouTube, Google, direct)
- ✅ Geography (countries, cities)
- ✅ Devices (desktop, mobile, tablet)
- ✅ Browser types
- ✅ Screen resolutions

### Custom Music Player Events
| Event Name | Description | Parameters |
|------------|-------------|------------|
| `track_play` | Track starts playing | track_title, track_position, track_duration |
| `track_pause` | Track paused | track_title, listen_percentage, listen_duration |
| `track_complete` | Track finished (>90%) | track_title, track_duration |
| `track_like` | Track liked/unliked | track_title, action (like/unlike) |
| `track_share` | Track shared | track_title, share_platform |
| `track_skip` | Next/Previous track | direction (next/previous), track_title |
| `player_shuffle` | Shuffle toggled | action (on/off) |
| `player_repeat` | Repeat mode changed | repeat_mode (off/all/one) |
| `player_looper` | DJ Looper toggled | looper_mode, action |
| `player_volume` | Volume changed | volume_level, action |

### Social Media & Navigation
| Event Name | Description | Parameters |
|------------|-------------|------------|
| `social_click` | Social media link clicked | platform, link_url, link_location |
| `contact_email` | Email link clicked | method |
| `navigation_click` | Menu section clicked | section |

### Engagement & Performance
| Event Name | Description | Parameters |
|------------|-------------|------------|
| `scroll_depth` | Page scroll milestones | depth_percentage (25/50/75/100) |
| `engagement_milestone` | Time spent on site | time_minutes (1/3/5/10) |
| `playlist_load` | Playlist loaded | load_source (cache/api), cache_hit |
| `playlist_error` | Playlist load failed | error_message |

---

## 🧪 How to Test Analytics (Right Now)

### Real-Time Testing in GA4

1. **Open Google Analytics Dashboard**
   - Go to: https://analytics.google.com
   - Select property: "Monolit Beatz Website"

2. **Go to Real-Time Report**
   - Left sidebar → Reports → Realtime
   - You'll see live activity as it happens

3. **Open Your Website**
   - Open: https://elarmuzik1993.github.io/ (or localhost for testing)
   - Keep GA4 dashboard open in another tab

4. **Test These Actions & Watch GA4 Update:**

   **Basic Page View:**
   - ✅ Load the page → See "1 user" in Real-time
   - Event: `page_view`

   **Music Player Actions:**
   - ✅ Click Play → Event: `track_play`
   - ✅ Click Pause → Event: `track_pause`
   - ✅ Click Next track → Event: `track_skip` (direction: next)
   - ✅ Like a track → Event: `track_like`
   - ✅ Share a track → Event: `track_share`
   - ✅ Toggle Shuffle → Event: `player_shuffle`
   - ✅ Toggle Repeat → Event: `player_repeat`
   - ✅ Toggle Looper → Event: `player_looper`
   - ✅ Mute/Unmute → Event: `player_volume`

   **Navigation & Social:**
   - ✅ Click "About" in menu → Event: `navigation_click` (section: about)
   - ✅ Click Instagram icon → Event: `social_click` (platform: instagram)
   - ✅ Click email link → Event: `contact_email`

   **Scroll & Engagement:**
   - ✅ Scroll 50% down → Event: `scroll_depth` (depth_percentage: 50)
   - ✅ Stay on site 1 minute → Event: `engagement_milestone` (time_minutes: 1)

### Browser Console Testing (Debug Mode)

1. **Open Developer Tools**
   - Press `F12` or right-click → "Inspect"
   - Go to "Console" tab

2. **Check Analytics Initialization**
   - You should see: `📊 Analytics initialized - GA4 tracking active`

3. **Enable Debug Mode** (Optional)
   - Edit `analytics.js` line 16: Change `const ANALYTICS_DEBUG = false;` to `true`
   - Reload page
   - All events will log to console: `📊 GA4 Event: track_play { track_title: "...", ... }`

---

## 📈 Accessing Your Analytics Dashboard

### 1. Login
- Go to: https://analytics.google.com
- Sign in with your Google account

### 2. Main Dashboard Views

**Reports → Realtime**
- See current visitors RIGHT NOW
- Live event tracking (updates every few seconds)
- Geographic location map
- Active pages

**Reports → Engagement → Events**
- See all custom events (track_play, track_like, etc.)
- Event counts and trends
- Most popular tracks
- User engagement patterns

**Reports → Acquisition → Traffic acquisition**
- Where visitors come from (Instagram, YouTube, Google, direct)
- Top referral sources
- Campaign tracking

**Reports → Engagement → Pages and screens**
- Most visited pages
- Time spent on each page
- Scroll depth data

**Reports → User attributes → Demographics**
- Age ranges (if available)
- Gender distribution
- Countries and cities

**Reports → Tech → Tech details**
- Desktop vs Mobile vs Tablet
- Browser types (Chrome, Safari, Firefox, etc.)
- Operating systems
- Screen resolutions

### 3. Custom Reports You Should Create

**Top Tracks Report:**
1. Go to: Explore → Create new exploration
2. Technique: Free form
3. Dimensions: Event name, Track title
4. Metrics: Event count
5. Filter: Event name = "track_play"
6. Sort by: Event count (descending)
7. Result: See which tracks are most played

**Social Media Performance:**
1. Explore → Create new exploration
2. Dimensions: Event name, Platform
3. Metrics: Event count
4. Filter: Event name = "social_click"
5. Result: See which platforms get most clicks

---

## 📊 Key Metrics to Monitor Weekly

### 1. Traffic Overview
- **Total Users:** How many unique visitors?
- **Sessions:** Total visits to your site
- **Average Session Duration:** How long do people stay?
- **Bounce Rate:** % of people who leave immediately

### 2. Music Engagement
- **Most Played Tracks:** Which songs are popular?
  - Go to: Events → track_play → View event details
  - Look at `track_title` parameter breakdown

- **Track Completion Rate:** Do people finish songs?
  - Compare `track_play` vs `track_complete` counts
  - Formula: (track_complete / track_play) × 100

- **Likes:** Which tracks get most likes?
  - Events → track_like → Filter action = "like"

- **Shares:** Which tracks get shared most?
  - Events → track_share
  - Check `share_platform` to see if YouTube/Twitter/Facebook works best

### 3. Feature Usage
- **Shuffle Usage:** % of users who enable shuffle
- **Repeat Usage:** Which repeat mode is most popular?
- **Looper Usage:** How many users try the DJ Looper?
  - This tells you if features are being discovered

### 4. Traffic Sources
- **Instagram Performance:** Clicks from Instagram bio link
- **YouTube Performance:** Clicks from video descriptions
- **Spotify/Apple Music:** Cross-platform traffic
- **Google Search:** Organic discovery

### 5. Geographic Insights
- **Top Countries:** Where are your fans?
- **City Breakdown:** Specific locations with high engagement
- **Time Zones:** When are users most active?

---

## 🔍 Advanced Analysis Questions You Can Answer

1. **"Which track should I promote more?"**
   - Check: `track_play` event counts by track_title
   - Look at completion rate (track_complete)
   - See which tracks get shared most

2. **"Is my Instagram driving traffic?"**
   - Check: Traffic acquisition → Source = "instagram.com"
   - Compare with other social platforms

3. **"Are people using the DJ Looper feature?"**
   - Check: `player_looper` events where action = "on"
   - See which bar fractions are most popular

4. **"What devices should I optimize for?"**
   - Check: Tech details → Device category
   - If 70% mobile → focus on mobile experience

5. **"When is the best time to post new music?"**
   - Check: Realtime → by hour/day
   - See when you have most active users

6. **"Are visitors engaging or bouncing?"**
   - Check: `scroll_depth` events (if users scroll, they're engaged)
   - Check: `engagement_milestone` (1/3/5/10 minute marks)

---

## 🚨 Troubleshooting

### "I don't see any data in GA4"

**Wait 24-48 hours:** New properties take time to start reporting

**Check Real-Time Report:**
- Open your website
- Go to GA4 → Realtime
- You should see "1 user" immediately

**If Real-Time is empty:**
1. Verify Measurement ID is correct: `G-R3FYSJ1TQ7`
2. Check browser console for errors
3. Disable ad blockers (they block GA4)
4. Try incognito/private browsing mode

### "Events aren't showing up"

**Enable Debug Mode:**
- Edit `analytics.js` → Set `ANALYTICS_DEBUG = true`
- Reload page
- Check browser console for event logs

**Check gtag is loaded:**
- Console → Type: `typeof gtag`
- Should return: `"function"`

### "Custom parameters not visible"

**Mark as Custom Dimensions:**
1. GA4 → Admin → Custom definitions
2. Click "Create custom dimension"
3. Add: `track_title`, `platform`, `share_platform`, etc.
4. Wait 24 hours for data to populate

---

## 📱 GA4 Mobile App

**Download the app:**
- iOS: https://apps.apple.com/app/google-analytics/id881599038
- Android: https://play.google.com/store/apps/details?id=com.google.android.apps.giant

**Features:**
- ✅ Real-time visitor monitoring on the go
- ✅ Push notifications for traffic spikes
- ✅ Quick stats overview
- ✅ Custom report access

---

## 🎯 Action Items for You

### This Week:
1. ✅ Open GA4 dashboard: https://analytics.google.com
2. ✅ Bookmark the Realtime report for quick access
3. ✅ Test the implementation (play a track, click social links)
4. ✅ Verify events appear in Real-time

### Next Week:
1. Create "Top Tracks" custom report
2. Set up weekly email reports (Admin → Data display → Email)
3. Create goals/conversions (e.g., track "track_like" as conversion)

### Monthly:
1. Review most played tracks
2. Analyze traffic sources
3. Check mobile vs desktop split
4. Review engagement metrics (scroll depth, session duration)

---

## 🔐 Privacy & GDPR Compliance

✅ **GA4 is GDPR compliant by default**
- No PII (personally identifiable information) is collected
- IP addresses are anonymized
- User can't be tracked across sites (without consent)
- No personal data in custom events

✅ **Cookie Consent:**
- GA4 uses first-party cookies only
- Cookies are for analytics, not advertising
- Consider adding cookie consent banner if targeting EU users

---

## 📚 Useful Resources

**GA4 Documentation:**
- https://support.google.com/analytics/answer/9304153

**GA4 Learning Center:**
- https://skillshop.withgoogle.com/analytics

**Event Debugging:**
- Chrome Extension: Google Analytics Debugger
- https://chrome.google.com/webstore/detail/google-analytics-debugger/

**GA4 Demo Account (Practice):**
- https://support.google.com/analytics/answer/6367342

---

## 📞 Support

**Questions about analytics data:**
- Check GA4 Help Center: https://support.google.com/analytics

**Technical issues with tracking code:**
- Check browser console (F12 → Console tab)
- Enable debug mode in `analytics.js`
- Contact: Check implementation details in this guide

---

## 🎉 Summary

You now have **professional-grade analytics** tracking:

✅ **20+ custom events** tracking music player interactions
✅ **Automatic scroll depth** and engagement time tracking
✅ **Social media click** tracking from all platforms
✅ **Performance monitoring** (cache hits, errors)
✅ **Real-time data** visible immediately
✅ **Privacy-compliant** with GDPR best practices

**Next Steps:**
1. Visit https://analytics.google.com
2. Go to Realtime report
3. Open your website and interact with it
4. Watch the magic happen! 🎵📊

---

*Last Updated: November 3, 2025*
*Monolit Beatz Official Website - Analytics Implementation*
