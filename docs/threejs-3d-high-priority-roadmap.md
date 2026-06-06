# Three.js 3D Project High Priority Implementation Table

| Priority | Area | Feature | Goal | Current Status | Implementation Notes |
| --- | --- | --- | --- | --- | --- |
| P0 | Project Creation | 3D project template | New Project can create a Three.js-backed 3D project with project.json, scene, scripts, models, and materials folders. | Initial support added | Template uses `renderer.backend = "three"` and a starter MainScene. |
| P0 | Renderer Core | ThreeRenderer backend | Scene View can render basic 3D objects with Three.js. | Initial support added | Supports box, plane, directional light, grid, selection highlight, and move dragging. |
| P0 | Scene Schema | 3D object data | Store mesh/light metadata without breaking existing scenes. | Initial support added | Uses `ThreeObject` custom component data for `kind`, `z`, `depth`, material values, and rotations. |
| P0 | Editor Integration | Renderer selection | Editor and project settings can switch to Three.js 3D. | Initial support added | `ProjectRenderBackend` now supports `three`. |
| P0 | Android Creation | Mobile 3D project creation | APK can create Three.js 3D starter projects. | Initial support added | Android bridge writes starter 3D scene and folders. |
| P1 | Inspector | Dedicated ThreeObject inspector | Visual editing for mesh type, z/depth, material, light intensity, and model path. | Not started | Replace raw Custom component editing for common 3D fields. |
| P1 | Transform | True 3D transform | Add position Z, rotation X/Y/Z, and scale Z. | Not started | Current Transform remains 2D-compatible; ThreeRenderer reads extra values from ThreeObject. |
| P1 | Gizmos | 3D move/rotate/scale handles | Scene View needs axis gizmos for 3D editing. | Not started | Use Three.js raycasting and axis planes; keep 2D gizmos untouched. |
| P1 | Camera | 3D camera component | Support perspective/orthographic camera controls, FOV, clipping, orbit/pan/zoom. | Partial | Initial renderer has fixed orthographic camera. |
| P1 | Asset Pipeline | GLB/glTF import | Import and preview 3D model files. | Not started | Add asset type `model`; support `.glb`, `.gltf`, textures. |
| P1 | Materials | Visual material editor | Edit color, texture maps, metalness, roughness, opacity, normal map. | Not started | Can reuse existing color parser and asset picker. |
| P1 | Runtime | 3D play loop | Scripts can move 3D objects and query 3D transforms during play. | Partial | Current ThreeRenderer renders editor scene; runtime-specific 3D behavior needs expansion. |
| P1 | Selection | 3D picking reliability | Click/select nested meshes and imported models reliably. | Partial | Basic mesh raycast is in place. |
| P1 | Debug | 3D debug overlays | Show bounds, collider volumes, axes, light helpers, camera frustum. | Not started | Use Three.js helpers and component-level debug toggles. |
| P1 | Collision | 3D collider components | Box/sphere/capsule colliders with visual debug and script queries. | Not started | Current Collider is 2D rect; needs 3D-compatible component or extension. |
| P2 | Physics | Physics backend | Add optional Rapier/Cannon-style rigidbody simulation. | Not started | Should be optional per project to avoid bundle cost. |
| P2 | Animation | 3D model animation | Play glTF skeletal/clip animations in editor and runtime. | Not started | Requires mixer support and animation state binding. |
| P2 | Lighting | Scene lighting workflow | Directional, point, spot, ambient, environment lighting. | Partial | Starter directional + hemisphere light only. |
| P2 | Prefabs | 3D prefab support | Save 3D object hierarchies and model instances as prefabs. | Not started | Existing prefab serializer can carry custom components. |
| P2 | Export | 3D web/apk export | Ensure Three.js assets and model files are included in exported games. | Not started | Extend asset audit and export dependency scan for model references. |
| P2 | Performance | Lazy three chunk | Split Three.js renderer into lazy chunk to reduce 2D project bundle cost. | Not started | Current static import increases main bundle size. |
| P2 | UX | 3D layout presets | Provide 3D-friendly panels, camera controls, and creation shortcuts. | Not started | Add cube/light/camera creation actions. |
