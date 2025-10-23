# Monolit Beatz - Official Music Portfolio Website

A modern, futuristic music portfolio website featuring an integrated YouTube music player, responsive design, and smooth scroll animations. Built with vanilla HTML, CSS, and JavaScript for optimal performance and GitHub Pages compatibility.

## Features

### Music Player
- **YouTube Playlist Integration**: Streams latest music releases from YouTube playlist
- **Custom Album Art**: High-resolution custom album artwork (albumart.png)
- **Full Playback Controls**: Play, pause, skip, previous, shuffle, and repeat modes
- **Interactive Tracklist**: Displays 12 tracks with ordering and duration
- **Like System**: Persistent like functionality using localStorage
- **Share Functionality**: Copy track links to clipboard for easy sharing
- **Progress Tracking**: Visual progress bar with time display
- **Volume Control**: Adjustable volume with mute toggle (default 100%)
- **Keyboard Shortcuts**: Space to play/pause, arrow keys for navigation
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Performance Caching**: 24-hour localStorage cache reduces API calls by 90-98%

### Design
- **Gritty Neon Aesthetic**: Modern cyberpunk-inspired design with red neon accents
- **Color Palette**: Neon red (#cc0000), deep black, and sharp contrasts
- **Typography System**:
  - Display: Bebas Neue (logo)
  - Sans-serif: Inter (headings and body text)
- **Custom Vector Icons**: Modern SVG graphics for all service cards
- **Sharp Square Design**: No rounded corners, bold geometric shapes
- **Neon Glow Effects**: Subtle multi-layer red glow on hover
- **Scroll Animations**: Bidirectional Intersection Observer-powered fade-in effects
- **Fixed Navigation**: Solid navbar with backdrop blur and red accent border
- **Mobile Optimized**: Compact tracklist, fixed navbar, optimized spacing

### Sections
- **Music Player**: Hero section with integrated YouTube player and custom album art
- **About**: Artist biography and background
- **Services**: 6 service cards with custom vector icons (Music Production, Recording, Beatmaking, Studio Gear Reviews, Visual Journeys, Sound Design)
- **Contact**: Social media links and contact information
- **Footer**: Social bar with platform links

### Custom Album Art
- **High Resolution**: Uses albumart.png for all tracks
- **Perfect Square**: 1:1 aspect ratio with 1.40x scale for optimal framing
- **Smooth Rendering**: Auto image-rendering for highest quality display
- **Recommended Size**: 2000x2000px or higher for crisp display

## Technologies Used

- **HTML5**: Semantic markup structure
- **CSS3**: Custom properties, flexbox, grid, animations
- **JavaScript (ES6+)**: Async/await, fetch API, event handling
- **YouTube Data API v3**: Playlist and video metadata fetching
- **YouTube IFrame Player API**: Audio playback
- **Intersection Observer API**: Scroll-triggered animations
- **LocalStorage API**: Persistent user preferences

## File Structure

```
Official-Website Monolit Beatz/
├── index.html              # Main HTML structure
├── styles.css              # Complete styling system with gritty neon aesthetic
├── script.js               # Navigation and scroll animations
├── musicPlayer.js          # YouTube player with caching functionality
├── albumart.png            # Custom high-resolution album artwork
├── attached_assets/        # Additional images and media files
│   └── red ghost 2 glo_1760362064230.png
└── README.md              # This file
```

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "Official-Website Monolit Beatz"
```

### 2. YouTube API Configuration

The site uses YouTube Data API v3 to fetch playlist data. The API key is configured in `musicPlayer.js`:

```javascript
const YOUTUBE_API_KEY = 'AIzaSyCxBqRgZkK3hlCz0AFoY2Ni5YtrP6bufsw';
const PLAYLIST_ID = 'PL6JY_zJieinfhtDbw0g6ZwV2s2heGKoXB';
```

**IMPORTANT - API Key Security**: The API key is restricted by HTTP referrer in Google Cloud Console:

1. **HTTP Referrer Restrictions** (Already configured):
   - Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
   - Select your API key
   - Under "Application restrictions", select "HTTP referrers (web sites)"
   - Allowed referrers:
     - `https://elarmuzik1993.github.io/*` (Production site)
     - `http://localhost:*` (Local development)
     - `http://127.0.0.1:*` (Local development)

2. **API Restrictions** (Already configured):
   - Under "API restrictions", select "Restrict key"
   - Only "YouTube Data API v3" is enabled
   - This prevents the key from being used for other Google services

**Note**: It's normal for YouTube API keys to be visible in client-side JavaScript. HTTP referrer restrictions ensure the key only works from your authorized domains, even if someone copies it from your source code.

### 3. Local Development

Simply open `index.html` in a web browser. For better local development experience, use a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## Deployment to GitHub Pages

### Option 1: Deploy from Main Branch

1. Initialize Git repository (if not already):
```bash
git init
git add .
git commit -m "Initial commit: Music player website"
```

2. Create GitHub repository and push:
```bash
git remote add origin https://github.com/yourusername/monolit-beatz.git
git branch -M main
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to repository Settings > Pages
   - Source: Deploy from branch
   - Branch: main / (root)
   - Click Save

4. Visit your site at: `https://yourusername.github.io/monolit-beatz/`

### Option 2: Deploy from gh-pages Branch

```bash
git checkout -b gh-pages
git push -u origin gh-pages
```

Then enable GitHub Pages from the `gh-pages` branch in repository settings.

## Configuration

### Update Playlist

To display a different YouTube playlist, edit `musicPlayer.js`:

```javascript
const PLAYLIST_ID = 'YOUR_PLAYLIST_ID'; // Replace with your playlist ID
const MAX_RESULTS = 12; // Change number of tracks to display
```

### Color Customization

Edit CSS custom properties in `styles.css`:

```css
:root {
    --primary-color: #cc0000;        /* Main red color */
    --secondary-color: #c0c0c0;      /* Silver */
    --accent-neon: #e60000;          /* Bright red accent */
    --dark-bg: #0a0a0a;              /* Background */
    /* ... */
}
```

### Typography

Change fonts by updating the `@import` in `styles.css` and CSS variables:

```css
@import url('https://fonts.googleapis.com/css2?family=Your+Font&display=swap');

:root {
    --font-display: 'Your Display Font', sans-serif;
    --font-serif: 'Your Serif Font', serif;
    --font-sans: 'Your Sans Font', sans-serif;
}
```

## Responsive Breakpoints

- **Desktop**: > 768px
- **Tablet**: 768px
- **Mobile**: 480px

Spacing automatically adjusts using the spacing scale system (--spacing-xs to --spacing-5xl).

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

Requires JavaScript enabled for music player functionality.

## API Quota & Performance

### Caching System (Implemented)

The website implements intelligent 24-hour localStorage caching to drastically reduce API usage:

**API Call Reduction**:
- **Without cache**: 2 API calls per page load
- **With cache**: 2 API calls only when cache expires (every 24 hours)
- **Savings**: 90-98% reduction in daily API calls

**Cache Features**:
- 24-hour cache duration (configurable in `musicPlayer.js`)
- Automatic cache validation on page load
- Fallback to stale cache if API fails (offline resilience)
- Debug tools available in browser console:
  - `MusicPlayer.getCacheInfo()` - Check cache status
  - `MusicPlayer.refreshCache()` - Clear cache and reload
  - `MusicPlayer.clearCache()` - Clear cache only

**YouTube Data API v3 Quota**:
- Default quota: 10,000 units/day
- Per fresh load: ~15 units (playlist + video details)
- **Without caching**: ~666 page loads/day
- **With caching**: ~40,000+ page loads/day (most from cache)

For even higher traffic:
1. Cache duration already optimized (24 hours)
2. Consider CDN caching headers
3. Request quota increase from Google if needed

## Features in Detail

### Music Player Controls

- **Play/Pause**: Space bar or click play button
- **Next/Previous**: Arrow keys or navigation buttons
- **Shuffle**: Randomize track order
- **Repeat**: Loop current track or entire playlist
- **Volume**: Click volume icon or use slider
- **Progress**: Click progress bar to seek

### Like and Share System

- **Like**: Click heart icon on any track (persists in localStorage)
- **Share**: Click share icon to copy YouTube link to clipboard
- **Track Selection**: Click any track in tracklist to play

### Scroll Animations

Elements fade in as they enter viewport:
- Sections fade up
- Cards stagger with delays
- About content slides from left/right
- Music player scales in
- Social bar fades with delay

## Customization Guide

### Adding New Sections

1. Add HTML section with class `section`:
```html
<section id="new-section" class="section">
    <h2 class="section-title">New Section</h2>
    <!-- content -->
</section>
```

2. The section will automatically get fade-in animation from `script.js`

### Adding Navigation Links

Update navbar in `index.html`:
```html
<li class="nav-item">
    <a href="#new-section" class="nav-link">New Section</a>
</li>
```

## Performance Optimization

- Lazy loading for YouTube IFrame API
- Intersection Observer for efficient scroll detection
- CSS transitions over JavaScript animations
- Minimal external dependencies
- Optimized image assets

## Credits

- **Design & Development**: Monolit Beatz
- **Music**: Monolit Beatz YouTube Channel
- **Fonts**: Google Fonts (Bebas Neue, Playfair Display, Inter)
- **APIs**: YouTube Data API v3, YouTube IFrame Player API

## License

All rights reserved. Music and content copyright Monolit Beatz.

## Contact

- **YouTube**: [UC4M3HjqgU0HCFr9mVXyStMA](https://www.youtube.com/channel/UC4M3HjqgU0HCFr9mVXyStMA)
- **Instagram**: [@monolitbeatz](https://instagram.com/monolitbeatz)
- **Spotify**: [Monolit Beatz](https://open.spotify.com/artist/...)
- **SoundCloud**: [@monolitbeatz](https://soundcloud.com/monolitbeatz)

## Support

For issues or questions about the website, please open an issue in the GitHub repository.

---

Made with passion for music and code.
