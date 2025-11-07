# Social Media Buttons Issue - Documentation for Human Developer

## Problem Description
The social media buttons ("Today's News", "LinkedIn", "X Posts") are not appearing on the home page despite being present in the code.

## Current Implementation Location
File: `client/src/pages/home.tsx`
Lines: 292-340 (approximately)

## Expected Behavior
- Three teal buttons should appear on the right side of the "Top Discussions" heading
- Buttons should have:
  - Background color: #0B666B (teal)
  - Text color: white
  - Right-aligned in the header area

## Current Code Structure
```jsx
<div className="flex items-center justify-between mb-4">
  <h3 className="text-2xl font-bold text-gray-900">
    {/* Discussion title */}
  </h3>
  <div className="flex items-center gap-2 relative z-50">
    <button style={{ backgroundColor: '#0B666B', color: 'white' }}>
      Today's News
    </button>
    {/* LinkedIn and X Posts buttons */}
  </div>
</div>
```

## Debugging Steps Already Tried
1. Added inline styles to override any CSS conflicts
2. Added z-index: 50 to ensure buttons are above other elements
3. Added visible yellow indicator to confirm the container is rendering
4. Used both className and inline style approaches
5. Added black borders for visibility testing

## Related Issue
Category filtering in the sidebar also appears to be not working properly. The onClick handlers are logging correctly but posts may not be updating when a category is selected.

## Backend Implementation Status
The backend for social media embeds is fully implemented:
- Database table: `social_media_embeds`
- API routes: `/api/social-media-embeds/:type`
- Admin panel: `/admin/social-media-embeds`

## Suggested Next Steps
1. Check browser DevTools to see if the button elements are in the DOM but hidden
2. Verify no CSS is overriding the display or visibility
3. Check if there's a parent element with overflow:hidden cutting off the buttons
4. Confirm the MainLayout component isn't affecting the layout
5. Test in an incognito window to rule out caching issues

## Previous Success
This feature was successfully implemented before, so there may be a regression or conflict with recent changes.