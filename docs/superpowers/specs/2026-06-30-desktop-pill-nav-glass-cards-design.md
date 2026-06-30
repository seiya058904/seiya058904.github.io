# Desktop Pill Navigation and Glass Cards

## Goal

Refresh the desktop homepage navigation and presentation surfaces so they feel coherent with the animated background. Preserve the site's content, interactions, accessibility, and desktop-first product direction.

## Scope

- Update only the desktop homepage presentation in `css/style.css`.
- Leave `mobile.html` and `css/mobile-legacy.css` unchanged.
- Leave comments, `account.html`, and `admin-likes.html` unchanged.
- Do not add React, GSAP, packages, assets, or new runtime dependencies.

## Navigation

Adapt the existing desktop header into a native PillNav-style composition:

- Keep the existing avatar, section links, account link, and background switcher.
- Use separate rounded surfaces for the avatar and navigation controls.
- Reproduce the reference motion with an expanding circular fill, outgoing/incoming
  label layers, logo rotation, and an initial logo/navigation reveal.
- Preserve current anchors, keyboard focus, sticky behavior, and reduced-motion support.
- Reuse existing HTML and JavaScript unless a verified interaction defect requires a minimal change.

## Card Treatment

Apply one light frosted-glass material to desktop homepage display cards:

- Cover hero, about, skills, PPT, and project cards.
- Use a translucent light surface, subtle backdrop blur, fine light border, inset highlight, and restrained shadow.
- Keep cover images opaque and sharp.
- Maintain readable text contrast over both desktop WebGL backgrounds.
- Preserve featured-card hierarchy, grid/filter states, buttons, likes, and hover behavior.
- Do not apply the material to comments or functional account/admin panels.

## Verification

- Compare the desktop page with both background modes at a wide and a narrower desktop viewport.
- Exercise navigation anchors, account link, background toggle, PPT search/category/expand controls, and likes.
- Check keyboard focus, reduced motion, console errors, overflow, and text contrast.
- Run `npm test` with the local preview active.
- Confirm the mobile page remains unchanged and usable.
