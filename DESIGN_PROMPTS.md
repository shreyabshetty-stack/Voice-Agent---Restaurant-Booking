# Google Stitch UI Design Prompts (DESIGN_PROMPTS.md)
## Restaurant Voice Reservation Assistant (Shiv Sagar Web App)

Use the following detailed visual prompts in Google's Stitch UI mockup generator to design the screens for the Shiv Sagar website and its voice agent booking interfaces.

---

### Prompt 1: Premium Landing Page & Floating Voice Widget Launcher

**Intent**: Generate a premium landing page mockup for a high-end Indian restaurant with a voice widget launcher in the bottom corner.

```text
Create a premium, modern dark-themed landing page layout for "Shiv Sagar", a luxury Indian vegetarian restaurant. 

Layout details:
1. BACKGROUND: Deep Obsidian Slate (#121214) with subtle marigold lighting leaks on the edges.
2. NAVIGATION: A clean, sticky header at the top. On the left, the restaurant logo: "SHIV SAGAR" in a modern brass-gold (#D4AF37) serif font. On the right, links for "Menu", "Our Story", "Locations" in font Inter, regular 16px, color light grey.
3. HERO SECTION: 
   - Left side contains bold headings in font Outfit (bold, 48px, white text): "Authentic Flavors, Reimagined." Below it, a subtitle in Inter (regular, 18px, color muted gold): "Experience culinary heritage paired with frictionless voice reservations."
   - Right side displays a large, floating glassmorphism card containing a high-resolution, vibrant photo of saffron-infused dishes, rich curries, and Indian breads.
4. FLOATING ACTION BUTTON (Voice Launcher) at the bottom-right corner:
   - Position: 32px from bottom, 32px from right.
   - Sizing: 56px x 56px perfect circle.
   - Color: Dynamic warm saffron gradient (#E37A20 to #F59E0B) with a soft gold outer glow shadow.
   - Icon inside: A clean white outline of a microphone merged with a speech bubble.
   - Hover state: A subtle scaling pulse effect with a marigold aura.
   - Render in premium desktop browser frame with high-fidelity UI details.
```

---

### Prompt 2: Phase 1 Chat Panel — Turn-Based "Push-to-Speak" Voice Interface

**Intent**: Generate the chat drawer popup displaying the turn-based push-to-speak message interface.

```text
Design a floating conversational chat widget overlay representing the Phase 1 "Push-to-Speak" Voice Reservation Assistant interface.

Layout & dimensions:
1. CONTAINER: A glassmorphic drawer floating on the bottom right corner of the page. Dimensions: 420px width, 640px height. Border radius: 24px. Background: Semi-transparent Midnight Charcoal (#1A1A1E) at 75% opacity with an intense backdrop blur (16px). Outer border: 1px solid #2D2D35.
2. HEADER: A solid charcoal banner. Contains:
   - Title: "Shiv Sagar Booking Assistant" in Outfit font, medium, 18px, color gold (#D4AF37).
   - A pulsing green status dot on the left with text: "Online" (Inter font, 14px, light grey text).
   - An elegant close icon (grey 'X') on the top right.
3. CONVERSATION FEED:
   - Message bubble 1 (Agent): Left-aligned. Rounded dark slate bubble, grey border. Text: "Hello! Welcome to Shiv Sagar's automated booking assistant. Would you like to book a new table, reschedule, or cancel an existing reservation?" (Font Inter, 15px, white text).
   - Message bubble 2 (User): Right-aligned. Rounded saffron bubble (#E37A20). Text: "I want to reserve a table for a special occasion anniversary dinner this Friday around 7:30 PM." (Font Inter, 15px, white text).
4. INPUT FOOTER:
   - A central massive round "Microphone Button" (72px x 72px) at the bottom.
   - Button styling: Golden-saffron circle outline with a transparent core and a white glowing microphone icon in the center.
   - A glowing white ring ripple radiates outwards from the mic button representing a "Ready to Record" state.
   - Below the button, a tiny caption in Inter (light, 12px, color muted grey): "Tap microphone to speak • Timezone: IST".
```

---

### Prompt 3: Phase 2 Call UI — Real-Time Streaming Voice Assistant

**Intent**: Generate the visualizer screen representing the real-time audio streaming connection (Gemini Live API interface).

```text
Create a modern, high-fidelity user interface mockup for Phase 2 "Real-Time Streaming Voice Assistant" for Shiv Sagar table reservations.

Layout & design elements:
1. CONTAINER: A glassmorphism floating widget, 420px width, 640px height, rounded corners 24px. Background: Dark Obsidian Slate (#121214) with an inner glow.
2. HEADER: Title reads "Voice Reservation Call" in Outfit font, 20px, white. Below it, a subtitle in Inter (regular, 14px, color #10B981): "Connected — Low Latency Stream".
3. DYNAMIC VOICE VISUALIZER (Main Center Canvas):
   - Occupies the center of the widget (320px height).
   - A dark background featuring a smooth, glowing 3D sine-wave ribbon.
   - The ribbon displays fluid, overlapping waves colored in a bright saffron gradient (#E37A20) and marigold gold (#D4AF37).
   - Dynamic ripple curves simulate active vocal synthesis.
   - Soft text overlay in the center of the visualizer reads: "Listening to you..." in Inter font, 16px, semi-bold, white, with a soft blur.
4. FOOTER CONTROLS:
   - A horizontal row of three circular buttons at the bottom:
     - Button A (Left): Mute Toggle. 48px circle, dark slate background, white microphone icon.
     - Button B (Center): End Reservation Call. Capsule shape, 140px width, 48px height, solid Chilli Red background (#EF4444) with a white phone-down icon and bold white text: "End Call".
     - Button C (Right): Keyboard/Text Mode. 48px circle, dark slate background, white keyboard icon.
```

---

### Prompt 4: Reservation Confirmation Card (The Booking Ticket)

**Intent**: Generate the physical-style ticket card confirming the reservation code, occasion, time in IST, and the 15-minute hold message.

```text
Generate a premium UI card design that represents a digital booking ticket/receipt for a confirmed restaurant reservation at Shiv Sagar.

Design specifications:
1. CARD BODY: A ticket-shaped vertical card with subtle semi-circle notches cut out on the left and right edges. Background: Deep charcoal textured canvas with gold foil line patterns running vertically. Border: 1px glowing marigold gold border (#D4AF37).
2. BRAND HEADER:
   - Text "SHIV SAGAR RESERVATION HOLD" in Outfit font, 14px, uppercase, letter-spacing 0.15em, brass gold color (#D4AF37).
3. RESERVATION CODE (Central Focus):
   - A distinct dark rectangle block. Inside it, the code "TABLE-B99" is displayed in a bold, glowing, monospace gold font. Font-size: 32px.
4. DETAIL LABELS:
   - Occasion Badge: A small forest cardamom green pill badge (#4A5D4E) with text "Special Occasion / Anniversary" in white text.
   - Date & Time Details: "Friday, August 14, 2026 at 7:30 PM" styled in font Outfit, semi-bold, 20px, white text.
   - Time Zone Label: "Indian Standard Time (IST)" styled in font Inter, regular, 12px, color light grey.
5. WARNING/HOLD FOOTER:
   - A bright warning section at the bottom. Background: Subtle red translucent layer.
   - Text: "Please note: We will hold your table for a maximum of 15 minutes past your reservation time (until 7:45 PM IST). No PII was collected during this booking." (Font Inter, regular, 13px, color Chilli Red #EF4444).
```
