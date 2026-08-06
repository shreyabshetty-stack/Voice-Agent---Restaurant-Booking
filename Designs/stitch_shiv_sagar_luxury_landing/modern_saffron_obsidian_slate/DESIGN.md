---
name: Modern Saffron & Obsidian Slate
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#dcc1b1'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#303032'
  outline: '#a48c7d'
  outline-variant: '#564337'
  surface-tint: '#ffb785'
  primary: '#ffb785'
  on-primary: '#502400'
  primary-container: '#e37a20'
  on-primary-container: '#4d2300'
  inverse-primary: '#954a00'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#b7ccb9'
  on-tertiary: '#233427'
  tertiary-container: '#879b8a'
  on-tertiary-container: '#213225'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc6'
  primary-fixed-dim: '#ffb785'
  on-primary-fixed: '#301400'
  on-primary-fixed-variant: '#713700'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#d3e8d5'
  tertiary-fixed-dim: '#b7ccb9'
  on-tertiary-fixed: '#0e1f13'
  on-tertiary-fixed-variant: '#394b3d'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
  obsidian-slate: '#121214'
  midnight-charcoal: '#1A1A1E'
  elevation-border: '#2D2D35'
  mint-emerald: '#10B981'
  amber-marigold: '#F59E0B'
  chilli-red: '#EF4444'
typography:
  display-h1:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  section-h2:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  widget-title:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-text:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  muted-caption:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  reservation-code:
    fontFamily: monospace
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  widget-width-desktop: 420px
  widget-max-height: 680px
  gutter: 1rem
  margin-mobile: 1rem
  margin-desktop: 2rem
---

# Design System Guidelines (DESIGN.md)
## Restaurant Voice Reservation Assistant (Shiv Sagar Web App)

This document outlines the visual language, design tokens, component specifications, and interaction states for Google's Stitch UI tool to generate the website mockups and voice agent interfaces.

---

### 1. Brand Identity & Design Theme

The restaurant **Shiv Sagar** represents a blend of rich, authentic Indian vegetarian culinary heritage and modern, premium urban dining. The design theme is **"Modern Saffron & Obsidian Slate"**—combining deep, luxurious dark backgrounds with warm, vibrant Indian spice colors and glowing glassmorphism accents.

#### Visual Personality
*   **Premium**: Sleek, uncluttered layouts with spacious margins.
*   **Vibrant**: Deep warm highlights simulating saffron, marigold, and polished brass.
*   **Fluid**: Smooth micro-interactions, wave visualizers, and soft glowing transitions.

---

### 2. Design Tokens

#### 2.1 Color Palette

```
Backgrounds (Dark Mode)
├─ Obsidian Slate (Primary Page Bg):    #121214 (HSL 240, 8%, 7%)
├─ Midnight Charcoal (Card/Panel Bg):    #1A1A1E (HSL 240, 8%, 10%)
└─ Elevation Border (Borders/Dividers):  #2D2D35 (HSL 240, 8%, 19%)

Brand Accents & Highlights
├─ Warm Saffron (Primary Accent):        #E37A20 (HSL 28, 79%, 51%)
├─ Polished Brass / Gold (Secondary):   #D4AF37 (HSL 46, 65%, 52%)
└─ Forest Cardamom (Muted Accent):       #4A5D4E (HSL 131, 11%, 33%)

Status Colors
├─ Mint Emerald (Success/Available):    #10B981 (HSL 150, 84%, 40%)
├─ Amber Marigold (Holds/Pending):       #F59E0B (HSL 38, 92%, 50%)
└─ Chilli Red (Errors/Refusals):        #EF4444 (HSL 0, 84%, 60%)
```

#### 2.2 Typography
*   **Font-Families**:
    *   **Headings / Hero Text**: `Outfit` (Google Fonts) — elegant geometric sans-serif with a premium, friendly look.
    *   **Body / Transcripts / Form UI**: `Inter` (Google Fonts) — highly readable, clean sans-serif optimized for chat interfaces.
*   **Font Scales**:
    *   `Display H1`: 3rem (48px) | Bold (700) | Tracking: -0.02em (Outfit)
    *   `Section H2`: 2rem (32px) | Semi-Bold (600) | Tracking: -0.01em (Outfit)
    *   `Widget Title`: 1.25rem (20px) | Medium (500) | Tracking: 0 (Outfit)
    *   `Body Text`: 1rem (16px) | Regular (400) | Line-Height: 1.5 (Inter)
    *   `Muted/Caption`: 0.875rem (14px) | Light/Regular (300/400) (Inter)

#### 2.3 Shadow & Blur (Glassmorphism)
*   **Card Backdrop Blur**: `backdrop-filter: blur(16px); webkit-backdrop-filter: blur(16px);`
*   **Card Background Overlay**: `rgba(26, 26, 30, 0.75)`
*   **Shadow (Soft Glow)**: `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 16px 0 rgba(227, 122, 32, 0.1);`

---

### 3. Layout Grid & Structure

*   **Responsive Framework**: Mobile-First, single-column chat drawer scaling to desktop-side panels.
*   **Breakpoint**:
    *   *Mobile*: Widget occupies full screen overlay (`width: 100vw; height: 100vh;`).
    *   *Desktop (> 768px)*: Floating widget at bottom-right corner (`width: 420px; max-height: 680px; bottom: 32px; right: 32px;`).

---

### 4. Component Design Specifications

#### 4.1 The Chat Widget Launcher
*   **Visuals**: Floating Action Button (FAB).
*   **Shape**: Perfect circle (`56px x 56px`).
*   **Design**: Glossy Saffron gradient background with a clean marigold glow.
*   **Icon**: Modern, minimalist dual icon inside (alternating between a speech bubble and a stylized microphone).
*   **Micro-Interaction**: Gentle breathing pulse animation when idle (`scale: 1` to `scale: 1.05` every 3 seconds).

#### 4.2 The Chat Panel (Phase 1: Push-to-Speak UI)
*   **Header**: Dark Charcoal solid banner containing:
    *   Shiv Sagar Logo (gold/brass text style).
    *   Status Indicator dot (Mint Emerald glowing: `"Assistant Online"`).
    *   Close icon (subtle grey button).
*   **Message Feed Area**:
    *   *Agent Bubble*: Left-aligned. Dark obsidian background, light grey border, white text. Time stamp under the bubble.
    *   *User Bubble*: Right-aligned. Deep saffron background, white text.
*   **Mic Input Area (Footer)**:
    *   Central massive round **Microphone Button** (`72px x 72px`).
    *   **Mic Button States**:
        *   `Idle`: Saffron circular outline, transparent center, golden microphone icon.
        *   `Recording (Pressed)`: Solid saffron background, white glowing ring expanding outwards (ripple animation).
        *   `Processing/Thinking`: Greyed out, showing a spinning marigold loader segment.
        *   `Speaking`: Multi-colored waveform animating next to the button.
    *   A tiny subtitle reading: *"Tap to talk (IST timezone enabled)"*.

#### 4.3 The Full-Duplex Calling Panel (Phase 2: Streaming UI)
*   **Design**: Shifts the widget into a call dashboard layout.
*   **Visualizer Canvas**:
    *   Occupies the top 60% of the card height.
    *   Displays a dynamic 3D-like glass ribbon wave. When the agent speaks, the wave ripples in golden/saffron hues. When the user speaks, it shifts to emerald/teal hues.
    *   Subtle text overlays inside the visualizer displaying real-time states (e.g., *"Listening..."*, *"Syncing Table Availability..."*).
*   **Control Footer**:
    *   Row of three buttons:
        1.  *Mute Toggle* (Circular button, dark slate, red slash line when muted).
        2.  *End Call* (Wide capsule button, solid red background, phone down icon, text: *"End Call"*).
        3.  *Text Chat Override* (Circular button, icon showing keyboard, allows user to switch back to text).

#### 4.4 The Reservation Confirmation Card
*   **Visuals**: Designed to look like a premium physical voucher/ticket.
*   **Background**: Marigold/Brass gradient with fine pattern lines.
*   **Details Displayed**:
    *   **Reservation Code**: Bold monospace font, font-size `2rem`, letter spacing `0.1em` (`TABLE-B99`).
    *   **Occasion Label**: Small pill badge (`Outdoor/Patio` or `Anniversary`).
    *   **Time Block**: *"August 10, 2026 at 7:30 PM (IST)"* (time and date styled in prominent medium-weight fonts).
    *   **Countdown Alert**: A bright Chilli Red warning badge at the bottom: *"Holding this table for 15:00 minutes"*.
