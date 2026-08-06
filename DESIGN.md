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
