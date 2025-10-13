# Monolit Beatz Official Website

## Overview

Monolit Beatz is a single-page artist portfolio website showcasing original music, experimental sounds, and visual journeys. The site serves as the official online presence for the artist, featuring their latest album "Humanity Last Beats," services offered, and social media integration. Built as a static frontend application, it provides an immersive browsing experience with smooth navigation and responsive design.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 13, 2025**
- Completed initial website implementation with all sections (Home, About, Reviews, Services, Contact)
- Integrated social media links from DistroKid (Instagram, YouTube, Spotify, Apple Music, iTunes, Deezer)
- Added actual album artwork from "Humanity Last Beats" album (Red Ghost 2 Glo design)
- Implemented accessible hamburger navigation menu using semantic <button> element with full keyboard support
- Configured web server workflow to serve the static site on port 5000
- Fixed image loading issues by using locally stored album artwork

## System Architecture

### Frontend Architecture

**Single-Page Application (SPA) Pattern**
- The application uses a traditional static HTML/CSS/JavaScript approach without framework dependencies
- All content is contained within a single HTML page with section-based navigation
- JavaScript handles smooth scrolling between sections and mobile menu interactions
- This approach was chosen for simplicity, fast loading times, and minimal overhead for a portfolio site

**Component Structure**
- Navigation bar: Fixed position with responsive hamburger menu for mobile devices
- Hero section: Main landing area with artist branding and call-to-action buttons
- Section-based layout: Organized into Home, About, Reviews, Services, and Contact sections
- Social media integration: Links to Instagram and YouTube embedded in the hero section

**Responsive Design Strategy**
- Mobile-first CSS approach using CSS custom properties (CSS variables) for theming
- Hamburger menu for mobile navigation with accessibility features (ARIA attributes)
- Flexible grid and flexbox layouts for adaptive content presentation
- The design prioritizes visual appeal with gradient backgrounds and modern aesthetics

### Styling Architecture

**CSS Custom Properties Theme System**
- Centralized color palette using CSS variables for consistent theming
- Primary colors: Pink (#ff0080) and cyan (#00d4ff) for brand identity
- Dark theme with multiple background layers for depth
- Gradient definitions for visual effects throughout the site

**Visual Design Decisions**
- Dark background (#0a0a0a) chosen to emphasize album artwork and create a modern music industry aesthetic
- Glassmorphism effects (backdrop-filter) on navigation for contemporary UI feel
- Smooth scroll behavior implemented for enhanced user experience

### Navigation & Interaction

**Client-Side Navigation**
- Hash-based navigation system using anchor links (#home, #about, etc.)
- JavaScript-powered smooth scrolling with navbar height offset calculation
- Menu state management with visual feedback (hamburger icon animation)
- Keyboard accessibility support (Enter and Space key handling)

**Mobile Menu Implementation**
- Toggle-based menu with CSS class manipulation
- Animated hamburger icon with three-line to X transformation
- ARIA attributes for screen reader compatibility (aria-expanded, aria-controls, aria-label)
- Auto-close functionality when navigation link is clicked

## External Dependencies

### Third-Party Services

**Social Media Platforms**
- Instagram: Artist profile integration (@elarmuzik)
- YouTube: Playlist embedding for music videos and content
- Spotify, Apple Music, iTunes, Deezer: Music streaming platform links

**Content Delivery**
- DistroKid CDN: Album artwork hosting (imgix CDN for image optimization)
- Album cover image served from: `distrokid.imgix.net` with query parameters for format (jpg) and quality optimization

### Asset Management
- SVG icons embedded inline for social media links (Instagram, YouTube, Spotify, Apple Music, iTunes, Deezer)
- No external icon libraries or font dependencies
- Self-contained styling with no CSS framework dependencies (Bootstrap, Tailwind, etc.)
- Album artwork stored locally in attached_assets directory

### Browser APIs Used
- Scroll API: For smooth scrolling navigation
- DOM Manipulation: Standard JavaScript for interactive elements
- CSS Backdrop Filter: For glassmorphism effects (may require fallbacks for older browsers)