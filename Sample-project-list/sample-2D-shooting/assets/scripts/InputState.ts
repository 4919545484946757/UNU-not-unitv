export default {
  actionMap: {
    move_left: ['KeyA', 'ArrowLeft'],
    move_right: ['KeyD', 'ArrowRight'],
    move_up: ['KeyW', 'ArrowUp'],
    move_down: ['KeyS', 'ArrowDown'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    fire: ['KeyJ', 'Mouse0'],
    interact: ['Mouse2'],
    menu: ['Escape'],
    inventory: ['KeyE'],
    use_item: ['KeyQ'],
    reload: ['KeyR'],
    hotbar_1: ['Digit1'],
    hotbar_2: ['Digit2'],
    hotbar_3: ['Digit3'],
    hotbar_4: ['Digit4'],
    hotbar_5: ['Digit5'],
    hotbar_6: ['Digit6']
  },
  mobileControls: {
    enabled: true,
    left: [
      { label: 'W', key: 'KeyW', className: 'up' },
      { label: 'A', key: 'KeyA', className: 'left' },
      { label: 'S', key: 'KeyS', className: 'down' },
      { label: 'D', key: 'KeyD', className: 'right' }
    ],
    right: [
      { label: 'Shift', key: 'ShiftLeft' },
      { label: 'Space', key: 'Space' },
      { label: 'R', key: 'KeyR' },
      { label: 'Esc', key: 'Escape' },
      { label: 'E', key: 'KeyE' },
      { label: 'Use', mouse: 0 },
      { label: 'Right', mouse: 2 }
    ]
  }
}
