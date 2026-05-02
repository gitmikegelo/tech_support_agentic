Redesign my current frontend to match the following aesthetic and layout:

## Design System
- **Framework**: Material UI (MUI) v5+
- **Theme**: Light mode, clean corporate/enterprise feel
- **Color palette**:
  - Primary: Accenture purple (#A100FF or similar)
  - Background: Light gray (#f5f5f5 or MUI default grey[100])
  - Cards: White (#fff) with subtle MUI elevation (elevation={1})
  - Text: Dark gray/black for headings, medium gray for secondary text
  - Success indicators: Green, Warning: Orange/Amber, Error: Red
- **Typography**: System UI / Roboto font stack
- **Spacing**: Consistent use of MUI spacing (8px grid system, spacing={3} for grid gaps)
- **Border radius**: MUI default rounded corners on all Paper/Card components
- **Shadows**: Subtle MUI default elevation shadows (elevation 1 for cards, elevation 4 for AppBar)

## Overall Layout
- Full viewport height, single-page dashboard
- Outer container: MuiBox wrapping everything
- Content wrapped in a MuiPaper container

## Header / AppBar
- Static MUI AppBar (position="static") with primary color background (purple)
- Left side: Logo image + app title ("Accenture Care Coach") in h6 Typography
- Right side contains:
  - A language selector dropdown (MUI Select/TextField with outlined variant, label "Language", default "English")
  - Notification bell icon button (MUI IconButton) with a badge (MuiBadge, color="error") showing count
  - Vertical dividers (MUI Divider) separating items
  - User account icon button (AccountCircleRounded icon)

## Main Content Area
- MUI Grid container with spacing={3}
- Two-column layout (roughly 50/50 split on large screens, stacks on small):
  - **Left column** (lg={6})
  - **Vertical divider** between columns (MUI Divider, orientation="vertical")
  - **Right column** (lg≈5.8)

## Left Column Content

### Top Row - Stats Cards (2 side-by-side)
- MUI Grid with 2 cards (sm={6} each)
- Each card contains:
  - A colored circular MUI Avatar with an icon inside (FormatListBulleted icon, Checklist icon)
  - Large h4 number (e.g., "4", "2")
  - Descriptive body2 text below (e.g., "No. of training simulations assigned")
- Card style: White background, subtle shadow, horizontal layout (avatar left, text right)

### "Create Training Simulation" Card
- MUI Card with:
  - CardHeader: h5 title "Create Training Simulation"
  - CardContent: body1 description paragraph
  - CardActions: Primary contained button labeled "CREATE" with a forward arrow icon (ArrowForwardIos)

### "Training Simulations (count)" Card
- MUI Card with:
  - CardHeader: h5 title with count, right-aligned "SEE ALL" link text with arrow icon
  - Scrollable list of simulation items, each containing:
    - Chat bubble outline icon (teal/primary colored)
    - Stack with: language tag + type label (body2, gray), simulation name (body1, bold/dark), creation date (body1, small gray)
    - Right side: MUI Chip with person avatar icon showing a count/dash

### "Training Template (count)" Card
- Similar to simulations card but with:
  - FeedOutlined icon instead of chat bubble
  - Same layout pattern for list items

## Right Column Content

### "Agents (count)" Section
- Card header with h5 "Agents (22)" and an outlined secondary "SEE ALL" button (small size)
- MUI Table with rows, each containing:
  - **Column 1**: Person avatar icon + rank badge overlay (Badge with numbers 1-3 using color coding: 1=primary/gold, 2=warning/silver, 3=error/bronze, rest=no badge) + agent name (body2)
  - **Column 2**: Score number with a colored dot badge indicator (green for high scores, orange for mid, red for low)
  - **Column 3**: Rank number (e.g., "#1", "#2")
- Table rows are hoverable (MuiTableRow with hover)
- Score thresholds for dot colors: ≥80 = success/green, 40-79 = warning/orange, <40 = error/red

## Key Interaction Patterns
- Buttons use MUI ripple (default)
- Select dropdowns use MUI outlined variant
- Cards are not clickable themselves but contain clickable actions
- Simulation list items have tabindex="0" and aria-labels for accessibility
- Responsive: 12-column grid stacks to single column on xs/sm breakpoints

## General Notes
- No sidebar navigation visible on this page
- Everything is contained within a centered Paper container
- Use MUI component composition (Box, Paper, Card, Grid, Stack, Avatar, Badge, Chip, Table, AppBar, Toolbar, IconButton, Button, Select, Divider, Typography)