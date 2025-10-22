# Monolit Beatz - Official Music Portfolio Website

A modern, futuristic music portfolio website featuring an integrated YouTube music player, responsive design, and smooth scroll animations. Built with vanilla HTML, CSS, and JavaScript for optimal performance and GitHub Pages compatibility.

## Features

### Music Player
- **YouTube Playlist Integration**: Streams latest music releases from YouTube playlist
- **Full Playback Controls**: Play, pause, skip, previous, shuffle, and repeat modes
- **Interactive Tracklist**: Displays 12 tracks with ordering and duration
- **Like System**: Persistent like functionality using localStorage
- **Share Functionality**: Copy track links to clipboard for easy sharing
- **Progress Tracking**: Visual progress bar with time display
- **Volume Control**: Adjustable volume with mute toggle
- **Keyboard Shortcuts**: Space to play/pause, arrow keys for navigation
- **Responsive Design**: Adapts to desktop, tablet, and mobile devices

### Design
- **Color Palette**: Neon red (#cc0000), black, and silver theme
- **Typography System**:
  - Display: Bebas Neue (logo)
  - Serif: Playfair Display (section headers)
  - Sans-serif: Inter (body text)
- **Glassmorphism**: Modern frosted glass effects on player components
- **Scroll Animations**: Bidirectional Intersection Observer-powered fade-in effects (triggers on scroll up and down)
- **Hero Animation**: Music player slides down from top on page load
- **Transparent Navigation**: Clean navbar that stays at top of page

### Sections
- **Music Player**: Hero section with integrated YouTube player
- **About**: Artist biography and background
- **Reviews**: Customer testimonials (3 reviews)
- **Services**: Offered music production services
- **Contact**: Social media links and contact information
- **Footer**: Social bar with platform links

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
├── styles.css              # Complete styling system
├── script.js               # Navigation and scroll animations
├── musicPlayer.js          # YouTube player functionality
├── attached_assets/        # Images and media files
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

The site uses YouTube Data API v3 to fetch playlist data. The API key is already configured in `musicPlayer.js`:

```javascript
const YOUTUBE_API_KEY = 'AIzaSyAmIespZYAy6UzTtRi1pXHtkQuPv5O1b2s';
const PLAYLIST_ID = 'PL6JY_zJieinfhtDbw0g6ZwV2s2heGKoXB';
```

**Security Recommendation**: For production, restrict the API key in Google Cloud Console:
1. Go to Google Cloud Console > Credentials
2. Select your API key
3. Under "Application restrictions", choose "HTTP referrers"
4. Add your domain: `https://yourusername.github.io/*`

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

## API Quota Considerations

YouTube Data API v3 has a default quota of 10,000 units per day.

**Per page load costs**:
- Playlist items fetch: ~3 units
- Video details fetch: ~1 unit per video
- Total per load: ~15 units

**Calculation**: 10,000 units ÷ 15 = ~666 unique page loads per day

For higher traffic, consider:
1. Implementing caching with localStorage
2. Using CDN caching
3. Requesting quota increase from Google

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
