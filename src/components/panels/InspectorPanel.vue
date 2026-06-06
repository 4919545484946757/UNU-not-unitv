<template>
  <div class="inspector">
    <template v-if="entity && transform">
      <h3>{{ entity.name }}</h3>
      <div v-if="runtime.isPlaying" class="tips">播放态为只读同步预览（显示运行时实体状态），停止播放后可编辑。</div>

      <div class="group">
        <div class="group-title">Basic</div>
        <label>
          Entity Name
          <input :value="entity.name" @input="setEntityName(($event.target as HTMLInputElement).value)" />
        </label>
        <div class="readonly">ID: {{ entity.id }}</div>
      </div>

      <section v-if="script" class="component-shell" :class="componentShellClass('script')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('script')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('script') ? '▸' : '▾' }}</button>
          <div><strong>Script</strong><span>脚本路径与实体配置</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Script')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('script')" class="component-shell-content">
      <ScriptInspector
        :script="script"
        :selected-script-asset-path="selectedScriptAssetPath"
        :can-open-script-asset="canOpenScriptAsset"
        :is-playing="runtime.isPlaying"
        @set-enabled="setScriptEnabled"
        @set-path="setScriptPath"
        @open-bound-script="void openBoundScriptAsset()"
        @bind-selected-script="bindSelectedScriptAsset"
        @open-script-panel="openScriptPanelForEntity"
        @open-external-editor="openEntityScriptCodeEditor"
        @remove-script="removeScriptComponent"
        @add-script="() => addScriptComponent()"
        @add-selected-script="addScriptComponentFromSelectedAsset"
      />
        </div>
      </section>

      <section class="component-shell" :class="componentShellClass('transform')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('transform')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('transform') ? '▸' : '▾' }}</button>
          <div><strong>Transform</strong><span>位置、缩放与旋转</span></div>
        </div>
        <div v-if="!isComponentCollapsed('transform')" class="component-shell-content">
      <TransformInspector
        :transform="transform"
        :is3d="is3DProject"
        :rotation-degrees="formatRotationDegrees(transform.rotation)"
        :rotation-x-degrees="formatRotationDegrees(transform.rotationX)"
        :rotation-y-degrees="formatRotationDegrees(transform.rotationY)"
        :rotation-z-degrees="formatRotationDegrees(transform.rotationZ)"
        @set-number="(key, event) => setNumber('transform', key, event)"
        @set-rotation="setRotationDegrees"
        @set-rotation-axis="setRotationAxisDegrees"
        @set-position-mode="setTransformPositionMode"
        @set-viewport-horizontal="setTransformViewportHorizontal"
        @set-viewport-vertical="setTransformViewportVertical"
      />
        </div>
      </section>

      <section v-if="!is3DProject && sprite" class="component-shell" :class="componentShellClass('sprite')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('sprite')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('sprite') ? '▸' : '▾' }}</button>
          <div><strong>Sprite</strong><span>贴图、尺寸与颜色</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Sprite')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('sprite')" class="component-shell-content">
      <SpriteInspector
        :sprite="sprite"
        :selected-image-path="selectedImageAssetPath"
        :hex-value="formatColorValue(sprite.tint, sprite.alpha)"
        :color-input="formatColorInput(sprite.tint)"
        @set-number="(key, event) => setNumber('sprite', key, event)"
        @set-text="(key, event) => setText('sprite', key, event)"
        @set-hex="(key, event) => setHexNumber('sprite', key, event)"
        @set-checked="(key, event) => setChecked('sprite', key, event)"
        @apply-selected-image="void applySelectedImage()"
        @open-atlas-editor="void openSpriteAtlasEditorForSelection()"
      />
        </div>
      </section>

      <section v-if="is3DProject && threeObject" class="component-shell" :class="componentShellClass('threeObject')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('threeObject')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('threeObject') ? '▸' : '▾' }}</button>
          <div><strong>Three Object</strong><span>3D 网格、材质、灯光和模型路径</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('ThreeObject')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('threeObject')" class="component-shell-content inline">
          <ThreeObjectInspector
            :data="threeObject.data || {}"
            :kind="threeObjectKind"
            :is-light="threeObjectIsLight"
            :sprite-alpha="sprite?.alpha ?? 1"
            :sprite-width="sprite?.width ?? 0"
            :sprite-height="sprite?.height ?? 0"
            :selected-model-asset-path="selectedModelAssetPath"
            :selected-image-asset-path="selectedImageAssetPath"
            :runtime-playing="runtime.isPlaying"
            :color-input="formatColorInput(threeObjectColor)"
            :color-value="formatColorValue(threeObjectColor, threeObjectNumber('opacity', sprite?.alpha ?? 1))"
            :model-animation-clips="modelAnimationClips"
            :bound-clip-for-current-model-state="boundClipForCurrentModelState"
            @set-kind="setThreeObjectKind"
            @set-text="setThreeObjectText"
            @set-number="setThreeObjectNumber"
            @set-size="setThreeObjectSize"
            @set-bool="setThreeObjectBool"
            @set-color="setThreeObjectColor"
            @bind-model="bindSelectedModelAsset"
            @refresh-clips="refreshModelAnimationClips"
            @set-animation-binding="setModelAnimationBinding"
            @bind-texture="bindSelectedThreeTexture"
          />
        </div>
      </section>

      <section v-if="!is3DProject && background" class="component-shell" :class="componentShellClass('background')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('background')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('background') ? '▸' : '▾' }}</button>
          <div><strong>Background</strong><span>背景跟随与适配</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Background')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('background')" class="component-shell-content">
      <BackgroundInspector
        :background="background"
        :selected-image-path="selectedImageAssetPath"
        @set-checked="(key, event) => setChecked('background', key, event)"
        @set-fit-mode="setBackgroundFitMode"
        @apply-selected-image="void applySelectedImageToBackground()"
        @add-background="addBackgroundComponent"
      />
        </div>
      </section>

      <div class="group component-shell" v-if="!is3DProject && animation" :class="componentShellClass('animation')">
        <div class="component-shell-header inline" @click="toggleComponentCollapsed('animation')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('animation') ? '▸' : '▾' }}</button>
          <div><strong>Animation</strong><span>序列帧与状态机</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Animation')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('animation')" class="component-shell-content inline">
        <template v-if="animation">
          <label>FPS <input type="number" min="1" :value="animation.fps" @input="setNumber('animation', 'fps', $event)" /></label>
          <label>Animation Asset <input :value="animation.animationAssetPath" readonly /></label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="animation.enabled" @change="setChecked('animation', 'enabled', $event)" />
            Enabled
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="animation.playing" @change="setChecked('animation', 'playing', $event)" />
            Playing
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="animation.loop" @change="setChecked('animation', 'loop', $event)" />
            Loop
          </label>

          <div class="subgroup">
            <div class="group-title">State Machine</div>
            <label class="checkbox-row">
              <input type="checkbox" :checked="animation.stateMachine.enabled" @change="setAnimationStateMachineEnabled($event)" />
              Enable
            </label>
            <label>Initial State <input :value="animation.stateMachine.initialState" @input="setAnimationStateInitial($event)" /></label>
            <label>Default Action Name <input :value="getAnimationStateAction()" @input="setAnimationStateAction($event)" /></label>

            <div class="row-inline">
              <input
                class="grow"
                :value="newAnimationStateName"
                placeholder="New State Name"
                @input="newAnimationStateName = ($event.target as HTMLInputElement).value"
                @keydown.enter.prevent="addAnimationState"
              />
              <button class="small" @click="addAnimationState">Add State</button>
            </div>

            <div class="state-list" v-if="animation.stateMachine.clips.length">
              <button
                v-for="clip in animation.stateMachine.clips"
                :key="clip.name"
                type="button"
                class="state-chip"
                :class="{ active: selectedAnimationStateName === clip.name }"
                @click="selectAnimationState(clip.name)"
              >
                {{ clip.name }}
              </button>
            </div>

            <template v-if="selectedAnimationStateName">
              <label>Selected State Name <input :value="selectedAnimationStateName" @input="setSelectedAnimationStateName($event)" /></label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="selectedAnimationStateClip()?.loop ?? true" @change="setSelectedAnimationStateLoop($event)" />
                Selected State Loop
              </label>
              <label>
                Selected State Frames (one path per line)
                <textarea :value="getSelectedAnimationStateFrameText()" @input="setSelectedAnimationStateFrameText($event)"></textarea>
              </label>
              <label>
                Selected State Durations (one number per line)
                <textarea :value="getSelectedAnimationStateDurationText()" @input="setSelectedAnimationStateDurationText($event)"></textarea>
              </label>
              <button class="small danger" @click="removeAnimationState(selectedAnimationStateName)">Remove Selected State</button>
            </template>

            <div class="state-transitions">
              <div class="row-inline">
                <div class="group-title">Transitions</div>
                <button class="small" @click="addAnimationTransition">Add Transition</button>
              </div>
              <div v-if="animation.stateMachine.transitions.length" class="transition-list">
                <div v-for="(transition, index) in animation.stateMachine.transitions" :key="index" class="transition-card">
                  <label>
                    From
                    <select :value="transition.from" @change="setAnimationTransitionFrom(index, $event)">
                      <option value="*">*</option>
                      <option v-for="clip in animation.stateMachine.clips" :key="`from_${clip.name}`" :value="clip.name">{{ clip.name }}</option>
                    </select>
                  </label>
                  <label>
                    To
                    <select :value="transition.to" @change="setAnimationTransitionTo(index, $event)">
                      <option v-for="clip in animation.stateMachine.clips" :key="`to_${clip.name}`" :value="clip.name">{{ clip.name }}</option>
                    </select>
                  </label>
                  <label>
                    Condition
                    <select :value="transition.condition" @change="setAnimationTransitionCondition(index, $event)">
                      <option value="always">always</option>
                      <option value="ifMoving">ifMoving</option>
                      <option value="ifNotMoving">ifNotMoving</option>
                      <option value="ifActionDown">ifActionDown</option>
                      <option value="ifActionUp">ifActionUp</option>
                    </select>
                  </label>
                  <label v-if="transition.condition === 'ifActionDown' || transition.condition === 'ifActionUp'">
                    Action
                    <input :value="transition.action || ''" @input="setAnimationTransitionAction(index, $event)" />
                  </label>
                  <label>
                    Priority
                    <input type="number" :value="transition.priority ?? 0" @input="setAnimationTransitionPriority(index, $event)" />
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" :checked="transition.canInterrupt ?? true" @change="setAnimationTransitionCanInterrupt(index, $event)" />
                    Can Interrupt
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" :checked="transition.once ?? false" @change="setAnimationTransitionOnce(index, $event)" />
                    Once
                  </label>
                  <label>
                    Min Progress (0-1)
                    <input type="number" step="0.01" min="0" max="1" :value="transition.minNormalizedTime ?? 0" @input="setAnimationTransitionMinNormalizedTime(index, $event)" />
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" :checked="transition.exitTime ?? false" @change="setAnimationTransitionExitTime(index, $event)" />
                    Exit Time (At Last Frame)
                  </label>
                  <button class="small danger" @click="removeAnimationTransition(index)">Remove</button>
                </div>
              </div>
              <div v-else class="tips">No transition yet.</div>
            </div>
          </div>

          <label>
            Frame Paths (one path per line)
            <textarea :value="animation.framePaths.join('\n')" @input="setAnimationFrames($event)"></textarea>
          </label>
          <div class="asset-picker">
            <button @click="appendSelectedImageToAnimation">Append Selected Image</button>
            <span>{{ animation.framePaths.length }} frames</span>
          </div>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Animation component.</div>
          <button class="small" @click="addAnimationComponent">Add Animation Component</button>
        </template>
        </div>
      </div>

      <section v-if="collider" class="component-shell" :class="componentShellClass('collider')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('collider')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('collider') ? '▸' : '▾' }}</button>
          <div><strong>Collider</strong><span>碰撞箱与触发器</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Collider')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('collider')" class="component-shell-content">
          <ColliderInspector
            :collider="collider"
            :collision-layers="collisionLayers"
            @set-number="(key, event) => setNumber('collider', key, event)"
            @set-shape="setColliderShape"
            @set-layer="setColliderLayer"
            @set-mask-layer="setColliderMaskLayer"
            @set-checked="(key, event) => setChecked('collider', key, event)"
          />
        </div>
      </section>

      <section v-if="is3DProject && physicsBody" class="component-shell" :class="componentShellClass('physicsBody')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('physicsBody')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('physicsBody') ? '▸' : '▾' }}</button>
          <div><strong>Physics Body</strong><span>3D 刚体类型、速度、阻尼与重力设置</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('PhysicsBody')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('physicsBody')" class="component-shell-content">
          <PhysicsBodyInspector
            :body="physicsBody"
            @set-number="(key, event) => setNumber('physicsBody', key, event)"
            @set-checked="(key, event) => setChecked('physicsBody', key, event)"
            @set-body-type="setPhysicsBodyType"
          />
        </div>
      </section>

      <div v-if="interactable" class="group component-shell" :class="componentShellClass('interactable')">
        <div class="component-shell-header inline" @click="toggleComponentCollapsed('interactable')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('interactable') ? '▸' : '▾' }}</button>
          <div><strong>Interactable</strong><span>交互距离与交互行为</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Interactable')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('interactable')" class="component-shell-content inline">
        <template v-if="interactable">
          <label class="checkbox-row">
            <input type="checkbox" :checked="interactable.enabled" @change="setChecked('interactable', 'enabled', $event)" />
            Enabled
          </label>
          <label>Interact Distance <input type="number" min="0" :value="interactable.interactDistance" @input="setNumber('interactable', 'interactDistance', $event)" /></label>
          <label>
            Action Type
            <select :value="interactable.actionType" @change="setInteractableActionType">
              <option value="none">none</option>
              <option value="switchScene">switchScene</option>
              <option value="cycleTexture">cycleTexture</option>
              <option value="cycleTint">cycleTint</option>
              <option value="scripted">scripted</option>
            </select>
          </label>
          <label v-if="interactable.actionType === 'switchScene'">
            Target Scene
            <input :value="interactable.targetScene" @input="setText('interactable', 'targetScene', $event)" />
          </label>
          <template v-if="interactable.actionType === 'switchScene'">
            <label>
              Target Spawn ID / Name
              <input :value="interactable.targetSpawnId || ''" placeholder="例如 Spawn_From_Main" @input="setText('interactable', 'targetSpawnId', $event)" />
            </label>
            <label>
              Target Scene State
              <select :value="interactable.sceneStateMode || 'preserve'" @change="setInteractableSceneStateMode">
                <option value="preserve">Preserve runtime state</option>
                <option value="reset">Reset scene state</option>
              </select>
            </label>
          </template>
          <label v-if="interactable.actionType === 'cycleTexture'">
            Texture Cycle Paths (one per line)
            <textarea :value="interactableTextureCycleBuffer" @input="setInteractableTextureCycle($event)"></textarea>
          </label>
          <label v-if="interactable.actionType === 'cycleTint'">
            Tint Cycle (decimal or 0xhex, one per line)
            <textarea :value="interactableTintCycleBuffer" @input="setInteractableTintCycle($event)"></textarea>
          </label>
          <template v-if="interactable.actionType === 'scripted'">
            <div class="tips">Use Script component + JSON actions to define interaction behavior.</div>
            <button class="small" @click="ensureInteractionScript">Create/Reset Interaction Script Template</button>
          </template>
          <div class="script-link-card">
            <div>
              <strong>Interaction Code</strong>
              <span>{{ interactionCodeDescription }}</span>
            </div>
            <button class="small" @click="openInteractionCodeEditor">{{ interactionEditorButtonLabel }}</button>
          </div>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Interactable component.</div>
          <button class="small" @click="addInteractableComponent">Add Interactable Component</button>
        </template>
        </div>
      </div>

      <div v-if="!is3DProject && tilemap" class="group component-shell" :class="componentShellClass('tilemap')">
        <div class="component-shell-header inline" @click="toggleComponentCollapsed('tilemap')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('tilemap') ? '▸' : '▾' }}</button>
          <div><strong>Tilemap</strong><span>Tile 数据与碰撞编辑</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Tilemap')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('tilemap')" class="component-shell-content inline">
        <template v-if="tilemap">
          <label class="checkbox-row">
            <input type="checkbox" :checked="tilemap.enabled" @change="setChecked('tilemap', 'enabled', $event)" />
            Enabled
          </label>
          <label>Columns <input type="number" min="1" :value="tilemap.columns" @input="setNumber('tilemap', 'columns', $event)" @change="resizeTilemapData" /></label>
          <label>Rows <input type="number" min="1" :value="tilemap.rows" @input="setNumber('tilemap', 'rows', $event)" @change="resizeTilemapData" /></label>
          <label>Tile Width <input type="number" min="8" :value="tilemap.tileWidth" @input="setNumber('tilemap', 'tileWidth', $event)" @change="resizeTilemapData" /></label>
          <label>Tile Height <input type="number" min="8" :value="tilemap.tileHeight" @input="setNumber('tilemap', 'tileHeight', $event)" @change="resizeTilemapData" /></label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="tilemap.showCollision" @change="setChecked('tilemap', 'showCollision', $event)" />
            Show Collision Overlay
          </label>
          <div class="row-inline">
            <button class="small" @click="openTilemapEditor('tiles')">打开 Tiles 图形窗口</button>
            <button class="small" @click="openTilemapEditor('collision')">打开 Collision 图形窗口</button>
          </div>
          <label>
            Tiles (CSV rows)
            <textarea v-model="tilemapTilesBuffer" @input="applyTilemapBuffer('tiles')"></textarea>
          </label>
          <label>
            Collision (CSV rows, 0/1)
            <textarea v-model="tilemapCollisionBuffer" @input="applyTilemapBuffer('collision')"></textarea>
          </label>
          <label>
            Tile Texture Map (value=assetPath, one per line)
            <textarea v-model="tileTextureMapBuffer" @input="applyTileTextureMapBuffer"></textarea>
          </label>
          <div class="asset-picker">
            <button @click="bindSelectedImageToTileValue">Bind Selected Image To Tile Value</button>
            <input
              class="tile-bind-input"
              v-model="tileTextureBindValueInput"
              type="number"
              min="1"
              step="1"
              placeholder="Tile Value"
            />
            <span>{{ assets.selectedAsset?.type === 'image' ? assets.selectedAsset.path : 'Select an image and bind to numeric tile value' }}</span>
          </div>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have Tilemap component.</div>
          <button class="small" @click="addTilemapComponent">Add Tilemap Component</button>
        </template>
        </div>
      </div>

      <div v-if="!is3DProject && ui" class="group component-shell" :class="componentShellClass('ui')">
        <div class="component-shell-header inline" @click="toggleComponentCollapsed('ui')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('ui') ? '▸' : '▾' }}</button>
          <div><strong>UI</strong><span>文本、按钮与布局</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('UI')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('ui')" class="component-shell-content inline">
        <template v-if="ui">
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.enabled" @change="setChecked('ui', 'enabled', $event)" />
            Enabled
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.markdownEnabled" @change="setChecked('ui', 'markdownEnabled', $event)" />
            Markdown
          </label>
          <label>Render Mode
            <select :value="ui.renderMode" @change="setUIRenderMode">
              <option value="pixi">Pixi Text</option>
              <option value="html">HTMLoverlayer</option>
            </select>
          </label>
          <label>Mode
            <select :value="ui.mode" @change="setUIMode">
              <option value="text">Text</option>
              <option value="button">Button</option>
              <option value="slider">Slider</option>
            </select>
          </label>
          <label>
            Text
            <textarea
              class="ui-textarea"
              :value="ui.text"
              :placeholder="ui.renderMode === 'html' && !ui.markdownEnabled ? '<h1>Title</h1>\n<p>HTML content</p>' : ui.markdownEnabled ? '# 标题\n- 列表项\n**重点** 与 `代码`' : '支持多行文本，按 Enter 换行'"
              @input="setText('ui', 'text', $event)"
            ></textarea>
          </label>
          <template v-if="ui.renderMode === 'html'">
            <label>HTML File Path <input :value="ui.htmlSourcePath || ''" placeholder="assets/ui/pause-menu.html，留空使用上方 Text/HTML" @input="setText('ui', 'htmlSourcePath', $event)" /></label>
            <div class="asset-picker html-code-actions">
              <button type="button" @click="void createOrOpenHtmlUiAsset()">{{ ui.htmlSourcePath ? 'Open HTML Code' : 'Create HTML Asset' }}</button>
              <button type="button" :disabled="!selectedHtmlAssetPath" @click="bindSelectedHtmlAsset">Bind Selected HTML</button>
              <span>{{ ui.htmlSourcePath || selectedHtmlAssetPath || 'Use an HTML asset or create one for this UI' }}</span>
            </div>
            <div class="html-option-grid">
              <label class="checkbox-row">
                <input type="checkbox" :checked="ui.htmlUseIframe" @change="setChecked('ui', 'htmlUseIframe', $event)" />
                Iframe Isolation
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="ui.htmlAllowScripts" @change="setChecked('ui', 'htmlAllowScripts', $event)" />
                Allow JS
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="ui.htmlBridgeEnabled" @change="setChecked('ui', 'htmlBridgeEnabled', $event)" />
                UNU Bridge
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="ui.htmlDebugOverlay" @change="setChecked('ui', 'htmlDebugOverlay', $event)" />
                Debug Bounds
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="ui.htmlDebugConsole" @change="setChecked('ui', 'htmlDebugConsole', $event)" />
                Debug Console
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="ui.htmlAutoCreateAsset" @change="setChecked('ui', 'htmlAutoCreateAsset', $event)" />
                Auto Template
              </label>
            </div>
            <div class="tips">HTMLoverlayer 可直接写完整 HTML/CSS/JS，或链接工程内 .html 文件。HTML 中可调用 <code>window.UNU.emit(type, payload)</code> 连接游戏脚本。</div>
          </template>
          <label>Font Size <input type="number" min="8" max="96" :value="ui.fontSize" @input="setNumber('ui', 'fontSize', $event)" /></label>
          <div class="color-field">
            <label>
              Text Color
              <input type="color" :value="formatColorInput(ui.textColor)" @input="setHexNumber('ui', 'textColor', $event)" />
            </label>
            <label>
              Text Color
              <input :value="formatHexNumber(ui.textColor)" placeholder="#fff / 0xffffff / hsl(210 80% 90%)" @input="setHexNumber('ui', 'textColor', $event)" />
            </label>
          </div>
          <label>Width <input :value="ui.width" placeholder="760 或 80%" @input="setUiSize('width', $event)" /></label>
          <label>Height <input :value="ui.height" placeholder="480 或 70%" @input="setUiSize('height', $event)" /></label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.autoWidth" @change="setChecked('ui', 'autoWidth', $event)" />
            Auto Width
          </label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.autoHeight" @change="setChecked('ui', 'autoHeight', $event)" />
            Auto Height
          </label>
          <label>Min Width <input :value="ui.minWidth || 1" placeholder="1 或 20%" @input="setUiSize('minWidth', $event)" /></label>
          <label>Min Height <input :value="ui.minHeight || 1" placeholder="1 或 20%" @input="setUiSize('minHeight', $event)" /></label>
          <div class="color-field">
            <label>
              Background
              <input type="color" :value="formatColorInput(ui.backgroundColor)" @input="setHexNumber('ui', 'backgroundColor', $event)" />
            </label>
            <label>
              Background
              <input :value="formatColorValue(ui.backgroundColor, ui.backgroundAlpha)" placeholder="#2b3242cc / rgba(43,50,66,.8) / hsl(220 20% 25% / .8)" @input="setHexNumber('ui', 'backgroundColor', $event)" />
            </label>
          </div>
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.backgroundVisible" @change="setChecked('ui', 'backgroundVisible', $event)" />
            Show Background
          </label>
          <label class="alpha-field">
            Background Alpha
            <span>
              <input type="range" min="0" max="1" step="0.01" :value="ui.backgroundAlpha" @input="setNumber('ui', 'backgroundAlpha', $event)" />
              <input type="number" min="0" max="1" step="0.01" :value="ui.backgroundAlpha" @input="setNumber('ui', 'backgroundAlpha', $event)" />
            </span>
          </label>
          <label>Background Texture Path <input :value="ui.backgroundTexturePath || ''" placeholder="assets/images/ui/panel.png，留空使用背景色" @input="setText('ui', 'backgroundTexturePath', $event)" /></label>
          <label>Anchor X <input type="number" min="0" max="1" step="0.01" :value="ui.anchorX" @input="setNumber('ui', 'anchorX', $event)" /></label>
          <label>Anchor Y <input type="number" min="0" max="1" step="0.01" :value="ui.anchorY" @input="setNumber('ui', 'anchorY', $event)" /></label>
          <label>Parent UI ID / Name <input :value="ui.parentId || ''" placeholder="例如 PauseMenu_Backdrop" @input="setText('ui', 'parentId', $event)" /></label>
          <label>Layout
            <select :value="ui.layout || 'none'" @change="setUILayout">
              <option value="none">None</option>
              <option value="vertical">Vertical Children</option>
              <option value="horizontal">Horizontal Children</option>
            </select>
          </label>
          <label>Layout Gap <input type="number" min="0" :value="ui.layoutGap || 0" @input="setNumber('ui', 'layoutGap', $event)" /></label>
          <label>Padding X <input type="number" min="0" :value="ui.paddingX || 0" @input="setNumber('ui', 'paddingX', $event)" /></label>
          <label>Padding Y <input type="number" min="0" :value="ui.paddingY || 0" @input="setNumber('ui', 'paddingY', $event)" /></label>
          <label class="checkbox-row">
            <input type="checkbox" :checked="ui.interactable" @change="setChecked('ui', 'interactable', $event)" />
            Interactable
          </label>
          <template v-if="ui.mode === 'button' || ui.mode === 'slider'">
            <label>{{ ui.mode === 'slider' ? 'On Change Script Path' : 'On Click Script Path' }} <input :value="ui.onClickScriptPath" placeholder="assets/scripts/ui-button-click.js" @input="setText('ui', 'onClickScriptPath', $event)" /></label>
            <template v-if="ui.mode === 'slider'">
              <label>Slider Value <input type="number" step="0.01" :value="ui.sliderValue" @input="setNumber('ui', 'sliderValue', $event)" /></label>
              <label>Slider Min <input type="number" step="0.01" :value="ui.sliderMin" @input="setNumber('ui', 'sliderMin', $event)" /></label>
              <label>Slider Max <input type="number" step="0.01" :value="ui.sliderMax" @input="setNumber('ui', 'sliderMax', $event)" /></label>
            </template>
            <div class="asset-picker">
              <button :disabled="!selectedScriptAssetPath" @click="bindSelectedScriptToUIButton">Bind Selected Script</button>
              <span>{{ selectedScriptAssetPath || 'Select a script/text asset in Asset Tree first' }}</span>
            </div>
            <div class="tips">播放态 {{ ui.mode === 'slider' ? '拖动 Slider' : '点击 Button' }} 时会调用绑定脚本的 onUiClick(ctx)，没有该钩子时兼容调用 onInteract(ctx)。</div>
          </template>
        </template>
        <template v-else>
          <div class="tips">Current entity does not have UI component.</div>
          <button class="small" @click="addUIComponent">Add UI Component</button>
        </template>
        </div>
      </div>

      <section v-if="audio" class="component-shell" :class="componentShellClass('audio')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('audio')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('audio') ? '▸' : '▾' }}</button>
          <div><strong>Audio</strong><span>音频资源与播放设置</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Audio')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('audio')" class="component-shell-content">
          <AudioInspector
            :audio="audio"
            :selected-audio-path="selectedAudioAssetPath"
            @set-number="(key, event) => setNumber('audio', key, event)"
            @set-text="(key, event) => setText('audio', key, event)"
            @set-checked="(key, event) => setChecked('audio', key, event)"
            @set-group="setAudioGroup"
            @apply-selected-audio="void applySelectedAudio()"
            @add-audio="addAudioComponent"
          />
        </div>
      </section>

      <section v-if="camera" class="component-shell" :class="componentShellClass('camera')">
        <div class="component-shell-header" @click="toggleComponentCollapsed('camera')">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed('camera') ? '▸' : '▾' }}</button>
          <div><strong>Camera</strong><span>缩放、跟随和平滑</span></div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeBuiltinComponent('Camera')">删除</button>
        </div>
        <div v-if="!isComponentCollapsed('camera')" class="component-shell-content">
          <CameraInspector
            :camera="camera"
            :runtime-playing="runtime.isPlaying"
            :camera-preview-active="editor.cameraPreviewEntityId === entity?.id"
            @set-number="(key, event) => setNumber('camera', key, event)"
            @set-text="(key, event) => setText('camera', key, event)"
            @set-checked="(key, event) => setChecked('camera', key, event)"
            @set-projection="setCameraProjection"
            @add-camera="addCameraComponent"
            @set-from-editor-view="setCameraFromEditorView"
            @preview-camera-view="previewSelectedCameraView"
            @exit-camera-preview="exitCameraPreview"
          />
        </div>
      </section>

      <section
        v-for="custom in customComponents"
        :key="custom.type"
        class="component-shell custom-component-shell"
        :class="componentShellClass(`custom:${custom.type}`)"
      >
        <div class="component-shell-header" @click="toggleComponentCollapsed(`custom:${custom.type}`)">
          <button class="collapse-toggle" type="button">{{ isComponentCollapsed(`custom:${custom.type}`) ? '▸' : '▾' }}</button>
          <div>
            <strong>{{ custom.type }}</strong>
            <span>自定义 JSON 组件</span>
          </div>
          <button class="small danger" :disabled="runtime.isPlaying" @click.stop="removeCustomComponent(custom.type)">删除</button>
        </div>
        <div v-if="!isComponentCollapsed(`custom:${custom.type}`)" class="component-shell-content inline">
          <div v-if="isInventoryComponent(custom)" class="inventory-editor">
            <div class="inventory-editor-header">
              <div>
                <strong>Inventory Slots</strong>
                <span>图形化编辑实体携带的物品 ID，超过面板高度后可滚动。</span>
              </div>
              <button class="small" :disabled="runtime.isPlaying" @click="appendInventorySlot(custom)">+ Slot</button>
            </div>
            <div class="inventory-meta-grid">
              <label>
                Owner Type
                <input
                  :value="inventoryOwnerType(custom)"
                  :disabled="runtime.isPlaying"
                  placeholder="Player / Enemy / Chest"
                  @input="setInventoryOwnerType(custom, $event)"
                />
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  step="1"
                  :value="inventoryCapacity(custom)"
                  :disabled="runtime.isPlaying"
                  @input="setInventoryCapacity(custom, $event)"
                />
              </label>
            </div>
            <div class="inventory-slot-grid" :style="{ gridTemplateColumns: `repeat(${inventoryGridColumns(custom)}, minmax(112px, 1fr))` }">
              <label v-for="slot in inventorySlots(custom)" :key="slot.index" class="inventory-slot-card">
                <span class="inventory-slot-index">#{{ slot.index + 1 }}</span>
                <input
                  :value="slot.value"
                  :disabled="runtime.isPlaying"
                  placeholder="project:item"
                  @input="setInventorySlot(custom, slot.index, $event)"
                />
              </label>
            </div>
            <div class="row-inline inventory-actions">
              <button class="small" :disabled="runtime.isPlaying" @click="trimEmptyInventorySlots(custom)">Trim Empty</button>
              <span class="tips">示例格式：sample-2D-shooting:bow。空格子会保存为空字符串。</span>
            </div>
          </div>
          <label>
            Data (JSON)
            <textarea :value="formatCustomComponentData(custom)" @change="setCustomComponentData(custom, $event)"></textarea>
          </label>
          <div class="tips">自定义组件会随场景序列化保存，脚本可按组件类型读取这些数据。</div>
        </div>
      </section>

      <div v-if="inactiveComponentPanels.length" class="inactive-components">
        <div class="inactive-title">可添加组件</div>
        <button
          v-for="panel in inactiveComponentPanels"
          :key="panel.id"
          class="inactive-component-card"
          type="button"
          :disabled="runtime.isPlaying || panel.id === 'transform'"
          @click="addBuiltinComponent(panel.id)"
        >
          <span class="inactive-visual" aria-hidden="true"></span>
          <span class="inactive-copy">
            <strong>{{ panel.title }}</strong>
            <span>{{ panel.description }}</span>
          </span>
          <span class="inactive-action">{{ panel.id === 'transform' ? 'Required' : '+ Add' }}</span>
        </button>
      </div>

      <div class="custom-component-add">
        <div>
          <strong>Custom Component</strong>
          <span>自定义组件始终排在最后，适合存放项目/脚本专用数据。</span>
        </div>
        <div class="row-inline">
          <input v-model="customComponentName" placeholder="Component name, e.g. Health" @keydown.enter.prevent="addCustomComponent" />
          <button class="small" :disabled="runtime.isPlaying" @click="addCustomComponent">Add Custom</button>
        </div>
      </div>
      <div style="margin-bottom: 10px;"></div>
    </template>

    <div v-else class="empty">Select an entity in Scene Tree or Viewport first.</div>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AnimationComponent } from '../../engine/components/AnimationComponent'
import { AudioComponent } from '../../engine/components/AudioComponent'
import { BackgroundComponent } from '../../engine/components/BackgroundComponent'
import { CameraComponent } from '../../engine/components/CameraComponent'
import { COLLISION_LAYERS, ColliderComponent, DEFAULT_COLLISION_MASKS, type CollisionLayer } from '../../engine/components/ColliderComponent'
import { InteractableComponent } from '../../engine/components/InteractableComponent'
import { PhysicsBodyComponent } from '../../engine/components/PhysicsBodyComponent'
import { ScriptComponent } from '../../engine/components/ScriptComponent'
import { SpriteComponent } from '../../engine/components/SpriteComponent'
import { TilemapComponent } from '../../engine/components/TilemapComponent'
import type { TransformComponent } from '../../engine/components/TransformComponent'
import { UIComponent } from '../../engine/components/UIComponent'
import { CustomComponent } from '../../engine/components/CustomComponent'
import { loadGltfModelWithHierarchy } from '../../engine/renderer/modelAssetLoader'
import ScriptInspector from '../inspector/ScriptInspector.vue'
import TransformInspector from '../inspector/TransformInspector.vue'
import SpriteInspector from '../inspector/SpriteInspector.vue'
import ColliderInspector from '../inspector/ColliderInspector.vue'
import BackgroundInspector from '../inspector/BackgroundInspector.vue'
import AudioInspector from '../inspector/AudioInspector.vue'
import CameraInspector from '../inspector/CameraInspector.vue'
import PhysicsBodyInspector from '../inspector/PhysicsBodyInspector.vue'
import ThreeObjectInspector from '../inspector/ThreeObjectInspector.vue'
import {
  setInspectorBooleanField,
  setInspectorColorField,
  setInspectorNumberField,
  setInspectorTextField,
  type InspectorComponentGroup,
  type InspectorComponentMap
} from '../../engine/components/componentFieldSchema'
import { useAssetStore } from '../../stores/assets'
import { useProjectStore } from '../../stores/project'
import { useRuntimeStore } from '../../stores/runtime'
import { useSceneStore } from '../../stores/scene'
import { useSelectionStore } from '../../stores/selection'
import { useEditorStore } from '../../stores/editor'

const assets = useAssetStore()
const project = useProjectStore()
const runtime = useRuntimeStore()
const sceneStore = useSceneStore()
const selection = useSelectionStore()
const editor = useEditorStore()

const activeScene = computed(() => {
  if (runtime.isPlaying && sceneStore.runtimeScene) {
    const _tick = sceneStore.runtimeRevision
    void _tick
    return sceneStore.runtimeScene
  }
  return sceneStore.currentScene
})

const is3DProject = computed(() => project.renderBackend === 'three')
const entity = computed(() => activeScene.value?.getEntityById(selection.selectedEntityId) ?? null)
const transform = computed(() => entity.value?.getComponent<TransformComponent>('Transform') ?? null)
const sprite = computed(() => entity.value?.getComponent<SpriteComponent>('Sprite') ?? null)
const background = computed(() => entity.value?.getComponent<BackgroundComponent>('Background') ?? null)
const animation = computed(() => entity.value?.getComponent<AnimationComponent>('Animation') ?? null)
const collider = computed(() => entity.value?.getComponent<ColliderComponent>('Collider') ?? null)
const physicsBody = computed(() => entity.value?.getComponent<PhysicsBodyComponent>('PhysicsBody') ?? null)
const interactable = computed(() => entity.value?.getComponent<InteractableComponent>('Interactable') ?? null)
const script = computed(() => entity.value?.getComponent<ScriptComponent>('Script') ?? null)
const camera = computed(() => entity.value?.getComponent<CameraComponent>('Camera') ?? null)
const audio = computed(() => entity.value?.getComponent<AudioComponent>('Audio') ?? null)
const ui = computed(() => entity.value?.getComponent<UIComponent>('UI') ?? null)
const tilemap = computed(() => entity.value?.getComponent<TilemapComponent>('Tilemap') ?? null)
const threeObject = computed(() => entity.value?.getComponent<CustomComponent>('ThreeObject') ?? null)
const defaultCollapsedComponents: Record<string, boolean> = {
  script: true,
  threeObject: false,
  animation: true,
  collider: true,
  physicsBody: false,
  interactable: true,
  tilemap: true,
  ui: true,
  audio: true,
  camera: true
}

const collapsedComponents = ref<Record<string, boolean>>({ ...defaultCollapsedComponents })
const customComponentName = ref('')

type BuiltinComponentId = 'script' | 'transform' | 'sprite' | 'threeObject' | 'background' | 'animation' | 'collider' | 'physicsBody' | 'interactable' | 'tilemap' | 'ui' | 'audio' | 'camera'

interface InspectorComponentPanel {
  id: BuiltinComponentId
  type: string
  title: string
  description: string
  removable: boolean
  active: boolean
  projectMode?: '2d' | '3d'
}

const baseComponentPanelOrder: Array<Omit<InspectorComponentPanel, 'active'>> = [
  { id: 'script', type: 'Script', title: 'Script', description: '挂载项目脚本、内联配置或实体交互逻辑。', removable: true },
  { id: 'transform', type: 'Transform', title: 'Transform', description: '实体在世界或视窗中的位置、旋转和缩放。', removable: false },
  { id: 'sprite', type: 'Sprite', title: 'Sprite', description: '贴图、尺寸、颜色和可见性设置。', removable: true, projectMode: '2d' },
  { id: 'threeObject', type: 'ThreeObject', title: 'Three Object', description: '3D 网格/模型、材质、灯光、环境和模型动画。', removable: true, projectMode: '3d' },
  { id: 'background', type: 'Background', title: 'Background', description: '背景图跟随摄像机、适配模式与背景资源绑定。', removable: true, projectMode: '2d' },
  { id: 'animation', type: 'Animation', title: 'Animation', description: '序列帧、状态机和动画轨道设置。', removable: true, projectMode: '2d' },
  { id: 'collider', type: 'Collider', title: 'Collider', description: '碰撞箱、触发器、碰撞层与碰撞矩阵。', removable: true },
  { id: 'physicsBody', type: 'PhysicsBody', title: 'Physics Body', description: '3D 刚体模拟、速度、重力和阻尼。', removable: true, projectMode: '3d' },
  { id: 'interactable', type: 'Interactable', title: 'Interactable', description: '交互距离、交互脚本和门/箱子等交互行为。', removable: true },
  { id: 'tilemap', type: 'Tilemap', title: 'Tilemap', description: 'Tile 数据、碰撞数据和数值贴图绑定。', removable: true, projectMode: '2d' },
  { id: 'ui', type: 'UI', title: 'UI', description: '文本、按钮、Slider、Markdown/HTML Overlay 和布局。', removable: true, projectMode: '2d' },
  { id: 'audio', type: 'Audio', title: 'Audio', description: '音频资源、音量、循环和播放分组。', removable: true },
  { id: 'camera', type: 'Camera', title: 'Camera', description: '摄像机缩放、跟随目标和平滑/边界设置。', removable: true }
]

const componentPanelOrder = computed(() =>
  baseComponentPanelOrder.filter((panel) => {
    if (panel.projectMode === '3d') return is3DProject.value
    if (panel.projectMode === '2d') return !is3DProject.value
    return true
  })
)
const builtinComponentPanels = computed<InspectorComponentPanel[]>(() =>
  componentPanelOrder.value.map((panel) => ({ ...panel, active: isBuiltinComponentActive(panel.id) }))
)
const inactiveComponentPanels = computed(() => builtinComponentPanels.value.filter((panel) => !panel.active))
const customComponents = computed(() => {
  const current = entity.value
  if (!current) return []
  const builtInTypes = new Set(baseComponentPanelOrder.map((panel) => panel.type))
  return current.getAllComponents().filter((component) => !builtInTypes.has(component.type)) as CustomComponent[]
})
const newAnimationStateName = ref('')
const selectedAnimationStateName = ref('Idle')
const animationStateClips = computed(() => animation.value?.stateMachine.clips ?? [])
const tilemapTilesBuffer = ref('')
const tilemapCollisionBuffer = ref('')
const tileTextureMapBuffer = ref('')
const tileTextureBindValueInput = ref('1')
const interactableTextureCycleBuffer = ref('')
const interactableTintCycleBuffer = ref('')
const collisionLayers = COLLISION_LAYERS

const selectedScriptAssetPath = computed(() => {
  const asset = assets.selectedAsset
  if (!asset) return ''
  if (asset.type === 'script' || asset.type === 'animation' || asset.type === 'atlas' || asset.type === 'scene' || asset.type === 'prefab') return asset.path
  return ''
})
const selectedImageAssetPath = computed(() => assets.selectedAsset?.type === 'image' ? assets.selectedAsset.path : '')
const selectedAtlasAssetPath = computed(() => assets.selectedAsset?.type === 'atlas' ? assets.selectedAsset.path : '')
const selectedAudioAssetPath = computed(() => assets.selectedAsset?.type === 'audio' ? assets.selectedAsset.path : '')
const selectedModelAssetPath = computed(() => {
  const asset = assets.selectedAsset
  if (!asset) return ''
  const path = String(asset.path || '')
  if (asset.type === 'model' || /\.(glb|gltf|obj|fbx)$/i.test(path)) return path
  return ''
})
const selectedHtmlAssetPath = computed(() => {
  const path = String(assets.selectedAsset?.path || '')
  return path.toLowerCase().endsWith('.html') ? path : ''
})

const canOpenScriptAsset = computed(() => {
  const path = String(script.value?.scriptPath || '')
  return !!path && path.startsWith('assets/')
})

interface TilemapEditorApplyPayload {
  entityId: string
  mode: 'tiles' | 'collision'
  tiles: number[]
  collision: number[]
  tileTextureMap?: Record<number, string>
}

interface CodeEditorApplyPayload {
  id?: string
  mode?: string
  path?: string
  content?: string
  saveRequested?: boolean
  live?: boolean
}

let removeTilemapEditorListener: (() => void) | null = null
let removeCodeEditorListener: (() => void) | null = null
let removeCodeEditorClosedListener: (() => void) | null = null
let interactionCodeEditorSessionId = ''
let interactionCodeEditorEntityId = ''
let interactionCodeEditorFilePath = ''
let interactionCodeEditorRelativePath = ''
let interactionCodeEditorContent = ''
let entityScriptCodeEditorSessionId = ''
let entityScriptCodeEditorEntityId = ''
let htmlUiCodeEditorSessionId = ''
let htmlUiCodeEditorEntityId = ''
let htmlUiCodeEditorFilePath = ''
let htmlUiCodeEditorRelativePath = ''
let htmlUiCodeEditorContent = ''

const interactionCodeDescription = computed(() => {
  const path = script.value?.scriptPath?.trim() || ''
  if (!path) return '当前实体尚未绑定 Script 组件，可一键创建交互模板。'
  if (isProjectAssetScriptPath(path)) return path
  if (path.startsWith('custom://interaction')) return '实体内联 JSON 交互脚本'
  return path
})

const interactionEditorButtonLabel = computed(() => {
  if (!script.value) return '创建并编辑'
  return '编辑交互代码'
})

function applyTilemapEditorPayload(raw: unknown) {
  const payload = (raw || {}) as Partial<TilemapEditorApplyPayload>
  if (!payload.entityId || !sceneStore.currentScene) return
  const entity = sceneStore.currentScene.getEntityById(String(payload.entityId))
  const map = entity?.getComponent<TilemapComponent>('Tilemap')
  if (!map) return
  const size = Math.max(1, map.columns * map.rows)
  map.tiles = normalizeTileArray((payload.tiles || []) as number[], size)
  map.collision = normalizeTileArray((payload.collision || []) as number[], size)
  if (payload.tileTextureMap && typeof payload.tileTextureMap === 'object') {
    map.tileTextureMap = { ...(payload.tileTextureMap as Record<number, string>) }
  }
  tilemapTilesBuffer.value = tilemapToText(map.tiles)
  tilemapCollisionBuffer.value = tilemapToText(map.collision)
  tileTextureMapBuffer.value = tileTextureMapToText(map.tileTextureMap)
  sceneStore.markDirty()
}

onMounted(() => {
  removeTilemapEditorListener = window.unu?.onTilemapEditorApply?.((payload) => applyTilemapEditorPayload(payload)) || null
  removeCodeEditorListener = window.unu?.onCodeEditorApply?.((payload) => applyInteractionCodeEditorPayload(payload)) || null
  removeCodeEditorClosedListener = window.unu?.onCodeEditorClosed?.((payload) => handleInteractionCodeEditorClosed(payload)) || null
})

onBeforeUnmount(() => {
  removeTilemapEditorListener?.()
  removeTilemapEditorListener = null
  removeCodeEditorListener?.()
  removeCodeEditorListener = null
  removeCodeEditorClosedListener?.()
  removeCodeEditorClosedListener = null
})

watch(
  animationStateClips,
  (clips) => {
    if (!clips.length) {
      selectedAnimationStateName.value = ''
      return
    }
    if (!clips.some((clip) => clip.name === selectedAnimationStateName.value)) {
      selectedAnimationStateName.value = clips[0].name
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => [
    tilemap.value?.columns,
    tilemap.value?.rows,
    tilemap.value?.tiles,
    tilemap.value?.collision,
    tilemap.value?.tileTextureMap
  ],
  () => {
    if (!tilemap.value) {
      tilemapTilesBuffer.value = ''
      tilemapCollisionBuffer.value = ''
      tileTextureMapBuffer.value = ''
      return
    }
    tilemapTilesBuffer.value = tilemapToText(tilemap.value.tiles)
    tilemapCollisionBuffer.value = tilemapToText(tilemap.value.collision)
    tileTextureMapBuffer.value = tileTextureMapToText(tilemap.value.tileTextureMap)
  },
  { immediate: true, deep: true }
)

watch(
  () => [interactable.value?.actionType, interactable.value?.targetScene, interactable.value?.textureCycle, interactable.value?.tintCycle],
  () => {
    if (!interactable.value) {
      interactableTextureCycleBuffer.value = ''
      interactableTintCycleBuffer.value = ''
      return
    }
    interactableTextureCycleBuffer.value = (interactable.value.textureCycle || []).map((item) => String(item || '').trim()).filter(Boolean).join('\n')
    interactableTintCycleBuffer.value = (interactable.value.tintCycle || []).map((item) => String(Math.round(Number(item) || 0))).join('\n')
  },
  { immediate: true, deep: true }
)

function setEntityName(value: string) {
  if (runtime.isPlaying) return
  if (!entity.value) return
  entity.value.name = value
  sceneStore.markDirty()
}

function componentShellClass(id: string) {
  return {
    collapsed: isComponentCollapsed(id)
  }
}

function isComponentCollapsed(id: string) {
  if (Object.prototype.hasOwnProperty.call(collapsedComponents.value, id)) {
    return Boolean(collapsedComponents.value[id])
  }
  return id.startsWith('custom:')
}

function toggleComponentCollapsed(id: string) {
  collapsedComponents.value = {
    ...collapsedComponents.value,
    [id]: !collapsedComponents.value[id]
  }
}

function isBuiltinComponentActive(id: BuiltinComponentId) {
  switch (id) {
    case 'script': return Boolean(script.value)
    case 'transform': return Boolean(transform.value)
    case 'sprite': return Boolean(sprite.value)
    case 'threeObject': return Boolean(threeObject.value)
    case 'background': return Boolean(background.value)
    case 'animation': return Boolean(animation.value)
    case 'collider': return Boolean(collider.value)
    case 'physicsBody': return Boolean(physicsBody.value)
    case 'interactable': return Boolean(interactable.value)
    case 'tilemap': return Boolean(tilemap.value)
    case 'ui': return Boolean(ui.value)
    case 'audio': return Boolean(audio.value)
    case 'camera': return Boolean(camera.value)
    default: return false
  }
}

function addBuiltinComponent(id: BuiltinComponentId) {
  if (runtime.isPlaying) return
  switch (id) {
    case 'script': addScriptComponent(); break
    case 'sprite': addSpriteComponent(); break
    case 'threeObject': addThreeObjectComponent(); break
    case 'background': addBackgroundComponent(); break
    case 'animation': addAnimationComponent(); break
    case 'collider': addColliderComponent(); break
    case 'physicsBody': addPhysicsBodyComponent(); break
    case 'interactable': addInteractableComponent(); break
    case 'tilemap': addTilemapComponent(); break
    case 'ui': addUIComponent(); break
    case 'audio': addAudioComponent(); break
    case 'camera': addCameraComponent(); break
    case 'transform':
    default:
      break
  }
  collapsedComponents.value = { ...collapsedComponents.value, [id]: false }
}

function removeBuiltinComponent(type: string) {
  if (runtime.isPlaying) return
  if (!entity.value || type === 'Transform') return
  if (!entity.value.getComponent(type)) return
  if (!window.confirm(`确认删除 ${type} 组件吗？`)) return
  entity.value.removeComponent(type)
  sceneStore.markDirty()
  project.setStatus(`已删除 ${type} 组件`)
}

function normalizeCustomComponentType(value: string) {
  const base = value.trim().replace(/\s+/g, '')
  if (!base) return ''
  return base.startsWith('Custom:') ? base : `Custom:${base}`
}

function addCustomComponent() {
  if (runtime.isPlaying) return
  if (!entity.value) return
  const type = normalizeCustomComponentType(customComponentName.value || `Component${customComponents.value.length + 1}`)
  if (!type || entity.value.getComponent(type)) {
    project.setStatus('自定义组件名称为空或已存在。')
    return
  }
  entity.value.addComponent(new CustomComponent(type, { enabled: true }))
  customComponentName.value = ''
  collapsedComponents.value = { ...collapsedComponents.value, [`custom:${type}`]: false }
  sceneStore.markDirty()
  project.setStatus(`已添加自定义组件：${type}`)
}

const threeObjectKind = computed(() => String(threeObject.value?.data?.kind || 'box'))
const threeObjectIsLight = computed(() => ['directionalLight', 'pointLight', 'spotLight', 'ambientLight', 'environmentLight'].includes(threeObjectKind.value))
const modelAnimationClips = computed(() => {
  const clips = threeObject.value?.data?.modelAnimationClips
  return Array.isArray(clips) ? clips.map((clip) => String(clip || '').trim()).filter(Boolean) : []
})
const boundClipForCurrentModelState = computed(() => {
  const data = threeObject.value?.data
  if (!data || typeof data !== 'object') return ''
  const state = String(data.modelAnimationState || data.modelAnimationInitialState || '').trim()
  if (!state || !data.modelAnimationBindings || typeof data.modelAnimationBindings !== 'object' || Array.isArray(data.modelAnimationBindings)) return ''
  return String((data.modelAnimationBindings as Record<string, unknown>)[state] || '')
})
const threeObjectColor = computed(() => {
  const value = threeObject.value?.data?.color
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(0xffffff, Math.round(value)))
  if (typeof value === 'string') {
    const parsed = parseColorInput(value)
    if (parsed) return parsed.rgb
    const numeric = Number(value.trim().replace(/^#/, '0x'))
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(0xffffff, Math.round(numeric)))
  }
  return Math.max(0, Math.min(0xffffff, Math.round(Number(sprite.value?.tint ?? 0xffffff) || 0xffffff)))
})

function ensureThreeObjectData() {
  const component = threeObject.value
  if (!component) return null
  if (!component.data || typeof component.data !== 'object' || Array.isArray(component.data)) {
    component.data = {}
  }
  return component.data
}

function threeObjectNumber(key: string, fallback: number) {
  const value = Number(threeObject.value?.data?.[key])
  return Number.isFinite(value) ? value : fallback
}

function setThreeObjectKind(event: Event) {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data) return
  const value = (event.target as HTMLSelectElement).value
  data.kind = ['box', 'plane', 'model', 'directionalLight', 'pointLight', 'spotLight', 'ambientLight', 'environmentLight', 'worldEnvironment'].includes(value) ? value : 'box'
  markInspectorEntityDirty()
}

function setThreeObjectText(key: string, event: Event) {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data) return
  data[key] = (event.target as HTMLInputElement).value.trim()
  markInspectorEntityDirty()
}

function setThreeObjectNumber(key: string, event: Event, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data) return
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  data[key] = Math.max(min, Math.min(max, value))
  markInspectorEntityDirty()
}

function setThreeObjectSize(key: 'width' | 'height', event: Event) {
  if (runtime.isPlaying) return
  const value = Math.max(1, Number((event.target as HTMLInputElement).value))
  if (!Number.isFinite(value)) return
  const data = ensureThreeObjectData()
  if (data) data[key] = value
  if (sprite.value) sprite.value[key] = value
  markInspectorEntityDirty()
}

function setThreeObjectBool(key: string, event: Event) {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data) return
  data[key] = (event.target as HTMLInputElement).checked
  markInspectorEntityDirty()
}

function setThreeObjectColor(event: Event) {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data) return
  const raw = (event.target as HTMLInputElement).value.trim()
  const parsed = parseColorInput(raw)
  if (!parsed) return
  data.color = parsed.rgb
  if (typeof parsed.alpha === 'number') data.opacity = parsed.alpha
  markInspectorEntityDirty()
}

async function bindSelectedModelAsset() {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data || !selectedModelAssetPath.value) return
  data.kind = 'model'
  data.modelPath = selectedModelAssetPath.value
  data.modelNodeOverrides = data.modelNodeOverrides || {}
  const result = await loadGltfModelWithHierarchy(selectedModelAssetPath.value).catch((error) => {
    console.warn('[UNU][inspector] failed to read model hierarchy', selectedModelAssetPath.value, error)
    return null
  })
  if (result?.hierarchy) data.modelHierarchy = result.hierarchy
  if (result?.animationClips) {
    data.modelAnimationClips = result.animationClips
    const firstClip = result.animationClips[0] || ''
    if (firstClip && !String(data.modelAnimationInitialState || '').trim()) data.modelAnimationInitialState = firstClip
    if (firstClip && !String(data.modelAnimationState || '').trim()) data.modelAnimationState = firstClip
    if (typeof data.modelAnimationLoop !== 'boolean') data.modelAnimationLoop = true
    if (typeof data.modelAnimationEnabled !== 'boolean') data.modelAnimationEnabled = true
    if (!Number.isFinite(Number(data.modelAnimationSpeed))) data.modelAnimationSpeed = 1
  }
  markInspectorEntityDirty()
  project.setStatus(`已绑定 3D 模型：${selectedModelAssetPath.value}`)
}

async function refreshModelAnimationClips() {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  const modelPath = String(data?.modelPath || '').trim()
  if (!data || !modelPath) return
  const result = await loadGltfModelWithHierarchy(modelPath).catch((error) => {
    console.warn('[UNU][inspector] failed to refresh model animation clips', modelPath, error)
    return null
  })
  if (!result) {
    project.setStatus(`无法读取模型动画片段：${modelPath}`)
    return
  }
  data.modelHierarchy = result.hierarchy
  data.modelAnimationClips = result.animationClips
  const firstClip = result.animationClips[0] || ''
  if (firstClip && !String(data.modelAnimationInitialState || '').trim()) data.modelAnimationInitialState = firstClip
  if (firstClip && !String(data.modelAnimationState || '').trim()) data.modelAnimationState = firstClip
  if (typeof data.modelAnimationLoop !== 'boolean') data.modelAnimationLoop = true
  if (typeof data.modelAnimationEnabled !== 'boolean') data.modelAnimationEnabled = true
  if (!Number.isFinite(Number(data.modelAnimationSpeed))) data.modelAnimationSpeed = 1
  markInspectorEntityDirty()
  project.setStatus(result.animationClips.length ? `已刷新模型动画片段：${result.animationClips.join(', ')}` : `模型未包含 glTF 动画片段：${modelPath}`)
}

function setModelAnimationBinding(event: Event) {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data) return
  const state = String(data.modelAnimationState || data.modelAnimationInitialState || '').trim()
  if (!state) {
    project.setStatus('请先填写模型动画 State，再绑定 glTF 片段。')
    return
  }
  const clip = (event.target as HTMLSelectElement).value.trim()
  if (!data.modelAnimationBindings || typeof data.modelAnimationBindings !== 'object' || Array.isArray(data.modelAnimationBindings)) {
    data.modelAnimationBindings = {}
  }
  const bindings = data.modelAnimationBindings as Record<string, string>
  if (clip) bindings[state] = clip
  else delete bindings[state]
  markInspectorEntityDirty()
}

function bindSelectedThreeTexture(key: 'texturePath' | 'normalMapPath' | 'environmentMapPath' | 'worldTexturePath') {
  if (runtime.isPlaying) return
  const data = ensureThreeObjectData()
  if (!data || !selectedImageAssetPath.value) return
  data[key] = selectedImageAssetPath.value
  markInspectorEntityDirty()
  const label = key === 'normalMapPath' ? '法线贴图' : key === 'environmentMapPath' ? '环境贴图' : key === 'worldTexturePath' ? '世界环境球贴图' : '材质贴图'
  project.setStatus(`已绑定 ${label}：${selectedImageAssetPath.value}`)
}

function addThreeObjectComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || threeObject.value) return
  entity.value.addComponent(new CustomComponent('ThreeObject', {
    kind: 'box',
    width: 80,
    height: 80,
    depth: 80,
    metalness: 0.02,
    roughness: 0.65,
    opacity: 1,
    color: 0x8bd3ff,
    texturePath: '',
    normalMapPath: '',
    intensity: 1.3,
    modelPath: ''
  }))
  if (!sprite.value) {
    entity.value.addComponent(new SpriteComponent('', 80, 80, true, 1, 0x8bd3ff, true, 0, 0, true))
  }
  sceneStore.markDirty()
  project.setStatus('已添加 Three Object 组件')
}

function removeCustomComponent(type: string) {
  if (runtime.isPlaying) return
  if (!entity.value || !entity.value.getComponent(type)) return
  if (!window.confirm(`确认删除自定义组件“${type}”吗？`)) return
  entity.value.removeComponent(type)
  sceneStore.markDirty()
}

function formatCustomComponentData(component: CustomComponent) {
  try {
    return JSON.stringify(component.data || {}, null, 2)
  } catch {
    return '{}'
  }
}

function setCustomComponentData(component: CustomComponent, event: Event) {
  if (runtime.isPlaying) return
  const raw = (event.target as HTMLTextAreaElement).value
  try {
    const parsed = JSON.parse(raw || '{}')
    component.data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed }
    sceneStore.markDirty()
  } catch {
    project.setStatus(`自定义组件 ${component.type} 的 JSON 暂未保存：格式不合法。`)
  }
}

type InventorySlotView = {
  index: number
  value: string
}

function isInventoryComponent(component: CustomComponent) {
  return component.type === 'Inventory' || component.type.endsWith(':Inventory')
}

function inventoryData(component: CustomComponent) {
  if (!component.data || typeof component.data !== 'object' || Array.isArray(component.data)) {
    component.data = {}
  }
  return component.data
}

function inventoryRawItems(component: CustomComponent) {
  const data = inventoryData(component)
  return Array.isArray(data.items) ? data.items : []
}

function inventoryCapacity(component: CustomComponent) {
  const data = inventoryData(component)
  const explicit = Number(data.capacity)
  const itemCount = inventoryRawItems(component).length
  return Math.max(1, Number.isFinite(explicit) ? Math.floor(explicit) : Math.max(itemCount, 12))
}

function inventoryOwnerType(component: CustomComponent) {
  const value = inventoryData(component).ownerType
  return typeof value === 'string' ? value : ''
}

function normalizedInventoryItems(component: CustomComponent, capacity = inventoryCapacity(component)) {
  const data = inventoryData(component)
  const source = inventoryRawItems(component).map((item) => typeof item === 'string' ? item : String(item ?? ''))
  const normalized = Array.from({ length: capacity }, (_, index) => source[index] || '')
  data.items = normalized
  data.capacity = capacity
  return normalized
}

function inventorySlots(component: CustomComponent): InventorySlotView[] {
  return normalizedInventoryItems(component).map((value, index) => ({ index, value }))
}

function inventoryGridColumns(component: CustomComponent) {
  const data = inventoryData(component)
  const customColumns = Number(data.columns)
  if (Number.isFinite(customColumns) && customColumns > 0) {
    return Math.min(8, Math.max(1, Math.floor(customColumns)))
  }
  return Math.min(6, Math.max(1, inventoryCapacity(component)))
}

function setInventoryOwnerType(component: CustomComponent, event: Event) {
  if (runtime.isPlaying) return
  inventoryData(component).ownerType = (event.target as HTMLInputElement).value.trim()
  sceneStore.markDirty()
}

function setInventoryCapacity(component: CustomComponent, event: Event) {
  if (runtime.isPlaying) return
  const next = Math.max(1, Math.floor(Number((event.target as HTMLInputElement).value) || 1))
  normalizedInventoryItems(component, next)
  sceneStore.markDirty()
}

function setInventorySlot(component: CustomComponent, index: number, event: Event) {
  if (runtime.isPlaying) return
  const items = normalizedInventoryItems(component)
  items[index] = (event.target as HTMLInputElement).value.trim()
  inventoryData(component).items = items
  sceneStore.markDirty()
}

function appendInventorySlot(component: CustomComponent) {
  if (runtime.isPlaying) return
  normalizedInventoryItems(component, inventoryCapacity(component) + 1)
  sceneStore.markDirty()
}

function trimEmptyInventorySlots(component: CustomComponent) {
  if (runtime.isPlaying) return
  const items = normalizedInventoryItems(component)
  let nextLength = items.length
  while (nextLength > 1 && !items[nextLength - 1]) nextLength -= 1
  normalizedInventoryItems(component, nextLength)
  sceneStore.markDirty()
}

function setScriptEnabled(event: Event) {
  if (runtime.isPlaying) return
  if (!script.value) return
  script.value.enabled = (event.target as HTMLInputElement).checked
  script.value.initialized = false
  script.value.started = false
  sceneStore.markDirty()
}

function setScriptPath(event: Event) {
  if (runtime.isPlaying) return
  if (!script.value) return
  script.value.scriptPath = (event.target as HTMLInputElement).value.trim()
  script.value.instance = null
  script.value.initialized = false
  script.value.started = false
  sceneStore.markDirty()
}

function addScriptComponent(path = '') {
  if (runtime.isPlaying) return
  if (!entity.value || script.value) return
  entity.value.addComponent(new ScriptComponent(path, '', true))
  sceneStore.markDirty()
}

function addScriptComponentFromSelectedAsset() {
  if (!selectedScriptAssetPath.value) return
  addScriptComponent(selectedScriptAssetPath.value)
}

function bindSelectedScriptAsset() {
  if (runtime.isPlaying) return
  if (!script.value || !selectedScriptAssetPath.value) return
  script.value.scriptPath = selectedScriptAssetPath.value
  script.value.instance = null
  script.value.initialized = false
  script.value.started = false
  sceneStore.markDirty()
  project.setStatus(`已绑定脚本：${selectedScriptAssetPath.value}`)
}

async function openBoundScriptAsset() {
  const path = String(script.value?.scriptPath || '')
  if (!path || !path.startsWith('assets/')) return
  await assets.selectAsset(path)
  selection.clearSelection()
  editor.setRightTab('Script')
}

function openScriptPanelForEntity() {
  if (!entity.value) return
  selection.selectEntity(entity.value.id)
  editor.setRightTab('Script')
}

async function openEntityScriptCodeEditor() {
  if (!script.value || !entity.value) {
    addScriptComponent()
    if (!script.value) return
  }
  const targetEntity = entity.value
  if (!targetEntity) return
  if (!window.unu?.openCodeEditor) {
    project.setStatus('当前环境未接入代码编辑器窗口，请使用桌面版运行。')
    return
  }
  const sessionId = `entity_script_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const targetEntityId = targetEntity.id
  const result = await window.unu.openCodeEditor({
    id: sessionId,
    mode: 'inspector-entity-script',
    title: `${targetEntity.name || 'Entity'} Script Config`,
    path: script.value.scriptPath || 'entity://script-config',
    language: guessInteractionEditorLanguage(script.value.scriptPath || ''),
    content: script.value.sourceCode || ''
  })
  if (!result?.ok) {
    project.setStatus(`打开独立代码窗口失败：${result?.error || '未知错误'}`)
    return
  }
  selection.selectEntity(targetEntity.id)
  entityScriptCodeEditorSessionId = sessionId
  entityScriptCodeEditorEntityId = targetEntityId
  editor.lockScriptEditorExternal({
    id: sessionId,
    mode: 'inspector-entity-script',
    targetId: targetEntityId,
    label: `${targetEntity.name || 'Entity'} Script Config`
  })
  editor.setRightTab('Script')
  project.setStatus('已打开实体脚本配置独立窗口')
}

function removeScriptComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || !script.value) return
  if (!window.confirm(`确认移除实体“${entity.value.name}”上的 Script 组件吗？`)) return
  entity.value.removeComponent('Script')
  sceneStore.markDirty()
  project.setStatus('已移除 Script 组件')
}

function inspectorComponents(): InspectorComponentMap {
  return {
    transform: transform.value,
    sprite: sprite.value,
    background: background.value,
    collider: collider.value,
    animation: animation.value,
    camera: camera.value,
    physicsBody: physicsBody.value,
    audio: audio.value,
    ui: ui.value,
    tilemap: tilemap.value,
    interactable: interactable.value
  }
}

function markInspectorEntityDirty() {
  const entityId = entity.value?.id || ''
  const canRenderLocally = !!entityId && project.renderBackend === 'three' && !runtime.isPlaying
  if (canRenderLocally) {
    window.dispatchEvent(new CustomEvent('unu:entity-mutating', { detail: { entityId } }))
  }
  sceneStore.markDirty()
  if (canRenderLocally) {
    window.dispatchEvent(new CustomEvent('unu:entity-mutated', { detail: { entityId } }))
  }
}

function markDirtyIfUpdated(updated: boolean) {
  if (updated) markInspectorEntityDirty()
}

function setNumber(group: InspectorComponentGroup, key: string, event: Event) {
  if (runtime.isPlaying) return
  const value = Number((event.target as HTMLInputElement).value)
  markDirtyIfUpdated(setInspectorNumberField(inspectorComponents(), group, key, value))
}

function setUiSize(key: 'width' | 'height' | 'minWidth' | 'minHeight', event: Event) {
  if (runtime.isPlaying) return
  if (!ui.value) return
  const raw = (event.target as HTMLInputElement).value.trim()
  const nextValue = parseUiSizeInput(raw)
  if (nextValue === null) return
  Reflect.set(ui.value, key, nextValue)
  markInspectorEntityDirty()
}

function parseUiSizeInput(raw: string) {
  if (!raw) return 1
  if (/^\d+(\.\d+)?%$/.test(raw)) return raw
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(1, value) : null
}

function formatRotationDegrees(rotationRadians: number) {
  const degrees = radiansToDegrees(Number(rotationRadians) || 0)
  const rounded = Math.abs(degrees) < 0.0001 ? 0 : Math.round(degrees * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function setRotationDegrees(event: Event) {
  if (runtime.isPlaying) return
  if (!transform.value) return
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  transform.value.rotation = degreesToRadians(value)
  transform.value.rotationZ = transform.value.rotation
  markInspectorEntityDirty()
}

function setRotationAxisDegrees(key: 'rotationX' | 'rotationY' | 'rotationZ', event: Event) {
  if (runtime.isPlaying) return
  if (!transform.value) return
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  transform.value[key] = degreesToRadians(value)
  if (key === 'rotationZ') transform.value.rotation = transform.value.rotationZ
  markInspectorEntityDirty()
}

function degreesToRadians(value: number) {
  return value * Math.PI / 180
}

function radiansToDegrees(value: number) {
  return value * 180 / Math.PI
}

function setTransformPositionMode(event: Event) {
  if (runtime.isPlaying) return
  if (!transform.value) return
  const value = (event.target as HTMLSelectElement).value
  transform.value.positionMode = value === 'viewport' ? 'viewport' : 'world'
  if (!transform.value.viewportHorizontal) transform.value.viewportHorizontal = 'center'
  if (!transform.value.viewportVertical) transform.value.viewportVertical = 'middle'
  markInspectorEntityDirty()
}

function setTransformViewportHorizontal(event: Event) {
  if (runtime.isPlaying) return
  if (!transform.value) return
  const value = (event.target as HTMLSelectElement).value
  if (value === 'left' || value === 'center' || value === 'right') {
    transform.value.viewportHorizontal = value
    markInspectorEntityDirty()
  }
}

function setTransformViewportVertical(event: Event) {
  if (runtime.isPlaying) return
  if (!transform.value) return
  const value = (event.target as HTMLSelectElement).value
  if (value === 'top' || value === 'middle' || value === 'bottom') {
    transform.value.viewportVertical = value
    markInspectorEntityDirty()
  }
}

function setText(group: 'sprite' | 'camera' | 'audio' | 'ui' | 'interactable', key: string, event: Event) {
  if (runtime.isPlaying) return
  const value = (event.target as HTMLInputElement).value
  markDirtyIfUpdated(setInspectorTextField(inspectorComponents(), group, key, value))
}

function setHexNumber(group: 'sprite' | 'ui', key: string, event: Event) {
  if (runtime.isPlaying) return
  const raw = (event.target as HTMLInputElement).value.trim()
  const parsed = parseColorInput(raw)
  if (!parsed) return
  const components = inspectorComponents()
  let changed = setInspectorColorField(components, group, key, parsed.rgb)
  if (typeof parsed.alpha === 'number') {
    if (group === 'sprite' && key === 'tint') {
      changed = setInspectorNumberField(components, 'sprite', 'alpha', parsed.alpha) || changed
    } else if (group === 'ui' && key === 'backgroundColor') {
      changed = setInspectorNumberField(components, 'ui', 'backgroundAlpha', parsed.alpha) || changed
    }
  }
  markDirtyIfUpdated(changed)
}

function setCameraProjection(event: Event) {
  if (runtime.isPlaying) return
  if (!camera.value) return
  const value = (event.target as HTMLSelectElement).value
  camera.value.projection = value === 'perspective' ? 'perspective' : 'orthographic'
  markInspectorEntityDirty()
}

function setCameraFromEditorView() {
  if (runtime.isPlaying) {
    project.setStatus('播放状态下不能读取编辑视角到相机。')
    return
  }
  if (!entity.value || !camera.value) {
    project.setStatus('当前选中实体没有 Camera 组件。')
    return
  }
  window.dispatchEvent(new CustomEvent('unu:set-camera-from-editor-view', { detail: { entityId: entity.value.id } }))
}

function previewSelectedCameraView() {
  if (runtime.isPlaying) {
    project.setStatus('播放状态下不能进入编辑态相机预览。')
    return
  }
  if (!entity.value || !camera.value) {
    project.setStatus('当前选中实体没有 Camera 组件。')
    return
  }
  window.dispatchEvent(new CustomEvent('unu:preview-camera-view', { detail: { entityId: entity.value.id } }))
}

function exitCameraPreview() {
  window.dispatchEvent(new CustomEvent('unu:exit-camera-preview'))
}

function formatHexNumber(value: number) {
  const color = Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0)))
  return `#${color.toString(16).padStart(6, '0')}`
}

function formatColorValue(value: number, alpha?: number) {
  const color = Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0)))
  const normalizedAlpha = Math.max(0, Math.min(1, Number(alpha)))
  const hex = color.toString(16).padStart(6, '0')
  if (!Number.isFinite(normalizedAlpha) || normalizedAlpha >= 0.995) return `#${hex}`
  return `#${hex}${Math.round(normalizedAlpha * 255).toString(16).padStart(2, '0')}`
}

function formatColorInput(value: number) {
  return formatHexNumber(value)
}

function parseColorInput(raw: string): { rgb: number; alpha?: number } | null {
  const value = raw.trim()
  if (!value) return null
  return parseHexColor(value) || parseRgbColor(value) || parseHslColor(value)
}

function parseHexColor(value: string): { rgb: number; alpha?: number } | null {
  let normalized = value.trim()
  if (/^0x/i.test(normalized)) normalized = normalized.slice(2)
  else if (normalized.startsWith('#')) normalized = normalized.slice(1)
  else if (!/^[\da-f]{3,8}$/i.test(normalized)) return null
  if (!/^[\da-f]+$/i.test(normalized)) return null
  if (normalized.length === 3 || normalized.length === 4) {
    normalized = Array.from(normalized).map((char) => char + char).join('')
  }
  if (normalized.length !== 6 && normalized.length !== 8) return null
  const rgb = Number.parseInt(normalized.slice(0, 6), 16)
  if (!Number.isFinite(rgb)) return null
  const alpha = normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : undefined
  return { rgb, alpha }
}

function parseRgbColor(value: string): { rgb: number; alpha?: number } | null {
  const match = value.match(/^rgba?\((.*)\)$/i)
  if (!match) return null
  const parts = splitColorFunctionArgs(match[1])
  if (parts.length < 3) return null
  const r = parseRgbChannel(parts[0])
  const g = parseRgbChannel(parts[1])
  const b = parseRgbChannel(parts[2])
  if (r === null || g === null || b === null) return null
  const alpha = parts[3] === undefined ? undefined : parseAlpha(parts[3])
  if (parts[3] !== undefined && alpha === null) return null
  return { rgb: (r << 16) | (g << 8) | b, alpha: alpha ?? undefined }
}

function parseHslColor(value: string): { rgb: number; alpha?: number } | null {
  const match = value.match(/^hsla?\((.*)\)$/i)
  if (!match) return null
  const parts = splitColorFunctionArgs(match[1])
  if (parts.length < 3) return null
  const h = parseHue(parts[0])
  const s = parsePercent(parts[1])
  const l = parsePercent(parts[2])
  if (h === null || s === null || l === null) return null
  const alpha = parts[3] === undefined ? undefined : parseAlpha(parts[3])
  if (parts[3] !== undefined && alpha === null) return null
  const [r, g, b] = hslToRgb(h, s, l)
  return { rgb: (r << 16) | (g << 8) | b, alpha: alpha ?? undefined }
}

function splitColorFunctionArgs(value: string) {
  const normalized = value.trim().replace(/\s*\/\s*/g, ',')
  if (normalized.includes(',')) return normalized.split(',').map((part) => part.trim()).filter(Boolean)
  return normalized.split(/\s+/).map((part) => part.trim()).filter(Boolean)
}

function parseRgbChannel(value: string) {
  const trimmed = value.trim()
  const numeric = Number(trimmed.replace('%', ''))
  if (!Number.isFinite(numeric)) return null
  const channel = trimmed.endsWith('%') ? numeric * 2.55 : numeric
  return Math.max(0, Math.min(255, Math.round(channel)))
}

function parseHue(value: string) {
  const trimmed = value.trim().toLowerCase()
  const numeric = Number(trimmed.replace(/(deg|turn|rad)$/, ''))
  if (!Number.isFinite(numeric)) return null
  if (trimmed.endsWith('turn')) return ((numeric * 360) % 360 + 360) % 360
  if (trimmed.endsWith('rad')) return ((numeric * 180 / Math.PI) % 360 + 360) % 360
  return ((numeric % 360) + 360) % 360
}

function parsePercent(value: string) {
  const trimmed = value.trim()
  if (!trimmed.endsWith('%')) return null
  const numeric = Number(trimmed.slice(0, -1))
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.min(1, numeric / 100))
}

function parseAlpha(value: string) {
  const trimmed = value.trim()
  const numeric = Number(trimmed.replace('%', ''))
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.min(1, trimmed.endsWith('%') ? numeric / 100 : numeric))
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  const [rp, gp, bp] = h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c]
          : h < 300 ? [x, 0, c]
            : [c, 0, x]
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255)
  ]
}

function setChecked(group: 'sprite' | 'background' | 'collider' | 'physicsBody' | 'animation' | 'camera' | 'audio' | 'ui' | 'tilemap' | 'interactable', key: string, event: Event) {
  if (runtime.isPlaying) return
  const value = (event.target as HTMLInputElement).checked
  markDirtyIfUpdated(setInspectorBooleanField(inspectorComponents(), group, key, value))
}

function setInteractableSceneStateMode(event: Event) {
  if (runtime.isPlaying) return
  if (!interactable.value) return
  interactable.value.sceneStateMode = (event.target as HTMLSelectElement).value === 'reset' ? 'reset' : 'preserve'
  sceneStore.markDirty()
}

function setColliderLayer(event: Event) {
  if (runtime.isPlaying) return
  if (!collider.value) return
  const value = (event.target as HTMLSelectElement).value as CollisionLayer
  if (!COLLISION_LAYERS.includes(value)) return
  collider.value.layer = value
  collider.value.collidesWith = [...(DEFAULT_COLLISION_MASKS[value] || DEFAULT_COLLISION_MASKS.Default)]
  sceneStore.markDirty()
}

function setColliderMaskLayer(layer: CollisionLayer, event: Event) {
  if (runtime.isPlaying) return
  if (!collider.value) return
  const enabled = (event.target as HTMLInputElement).checked
  const current = new Set(collider.value.collidesWith || [])
  if (enabled) current.add(layer)
  else current.delete(layer)
  collider.value.collidesWith = Array.from(current).filter((item): item is CollisionLayer => COLLISION_LAYERS.includes(item as CollisionLayer))
  sceneStore.markDirty()
}

function setInteractableActionType(event: Event) {
  if (runtime.isPlaying) return
  if (!interactable.value) return
  const value = (event.target as HTMLSelectElement).value
  if (value === 'switchScene' || value === 'cycleTexture' || value === 'cycleTint' || value === 'scripted' || value === 'none') {
    interactable.value.actionType = value
    sceneStore.markDirty()
  }
}

function setInteractableTextureCycle(event: Event) {
  if (runtime.isPlaying) return
  if (!interactable.value) return
  const rows = (event.target as HTMLTextAreaElement).value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  interactableTextureCycleBuffer.value = rows.join('\n')
  interactable.value.textureCycle = rows
  sceneStore.markDirty()
}

function setInteractableTintCycle(event: Event) {
  if (runtime.isPlaying) return
  if (!interactable.value) return
  const rows = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  const parsed = rows
    .map((value) => {
      if (/^0x[0-9a-f]+$/i.test(value)) return Number.parseInt(value.slice(2), 16)
      const n = Number(value)
      return Number.isFinite(n) ? Math.round(n) : null
    })
    .filter((value): value is number => value !== null)
  interactableTintCycleBuffer.value = rows.join('\n')
  interactable.value.tintCycle = parsed
  sceneStore.markDirty()
}

function addInteractableComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || interactable.value) return
  entity.value.addComponent(new InteractableComponent(true, 180, 'none'))
  sceneStore.markDirty()
}

function ensureInteractionScript() {
  if (runtime.isPlaying) return
  if (!entity.value) return
  const template = `{
  "onInteract": [
    {
      "type": "cycleTint",
      "target": "self",
      "values": [16777215, 16762880, 9293460, 7979007]
    }
  ]
}`
  let component = script.value
  if (!component) {
    component = new ScriptComponent('custom://interaction', template, true)
    entity.value.addComponent(component)
  } else {
    component.scriptPath = component.scriptPath || 'custom://interaction'
    component.sourceCode = template
    component.enabled = true
    component.instance = null
    component.initialized = false
    component.started = false
  }
  sceneStore.markDirty()
}

function isProjectAssetScriptPath(path: string) {
  const normalized = path.replace(/\\/g, '/').trim()
  return normalized.startsWith('assets/') && !normalized.startsWith('custom://') && !normalized.startsWith('builtin://')
}

function fileNameOf(path: string) {
  if (!path) return 'script.js'
  const normalized = path.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(index + 1) : normalized
}

function directoryOf(path: string) {
  const normalized = path.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(0, index) : 'assets/scripts'
}

function guessInteractionEditorLanguage(path: string) {
  const lower = path.toLowerCase()
  if (lower.startsWith('custom://interaction')) return 'json'
  if (lower.endsWith('.json') || lower.endsWith('.anim') || lower.endsWith('.atlas')) return 'json'
  if (lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.css')) return 'html'
  if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.includes('builtin://')) return 'js'
  return 'plain'
}

function setColliderShape(event: Event) {
  if (runtime.isPlaying || !collider.value) return
  const value = (event.target as HTMLSelectElement).value
  collider.value.shape = value === 'circle' || value === 'box' || value === 'sphere' || value === 'capsule' ? value : 'rect'
  if (collider.value.shape === 'sphere') {
    collider.value.radius = Math.max(1, Number(collider.value.radius || Math.min(collider.value.width, collider.value.height, collider.value.depth || collider.value.width) / 2))
  } else if (collider.value.shape === 'capsule') {
    collider.value.radius = Math.max(1, Number(collider.value.radius || Math.min(collider.value.width, collider.value.depth || collider.value.width) / 2))
    collider.value.capsuleHeight = Math.max(collider.value.radius * 2, Number(collider.value.capsuleHeight || collider.value.height || 120))
  } else if (collider.value.shape === 'box') {
    collider.value.depth = Math.max(1, Number(collider.value.depth || collider.value.width || 80))
  }
  sceneStore.markDirty()
}

function setPhysicsBodyType(event: Event) {
  if (runtime.isPlaying || !physicsBody.value) return
  const value = (event.target as HTMLSelectElement).value
  physicsBody.value.bodyType = value === 'static' || value === 'kinematic' ? value : 'dynamic'
  sceneStore.markDirty()
}

function bindSelectedHtmlAsset() {
  if (runtime.isPlaying || !ui.value || !selectedHtmlAssetPath.value) return
  ui.value.renderMode = 'html'
  ui.value.htmlSourcePath = selectedHtmlAssetPath.value
  ui.value.htmlUseIframe = true
  ui.value.htmlAllowScripts = true
  ui.value.htmlBridgeEnabled = true
  sceneStore.markDirty()
  project.setStatus(`已绑定 HTML UI：${selectedHtmlAssetPath.value}`)
}

function createDefaultHtmlUiTemplate(targetUi: UIComponent, targetEntityName = 'UI') {
  const title = escapeHtmlForTemplate(targetEntityName || 'UI')
  const text = escapeHtmlForTemplate(String(targetUi.text || 'HTML UI'))
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      background: transparent;
      color: #f7fbff;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
      overflow: hidden;
    }
    .unu-panel {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      padding: 16px;
      box-sizing: border-box;
      background: rgba(24, 32, 48, 0.72);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
    }
    button {
      border: 1px solid rgba(255,255,255,0.24);
      background: rgba(72, 120, 220, 0.82);
      color: white;
      border-radius: 8px;
      padding: 8px 12px;
      font: inherit;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main class="unu-panel" data-unu-ui="${title}">
    <button data-unu-action="click">${text}</button>
  </main>
  <script>
    window.UNU?.emit('html-ui-ready', { name: ${JSON.stringify(targetEntityName || 'UI')} });
    document.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-unu-action]')?.dataset?.unuAction;
      if (action) window.UNU?.emit(action, { time: Date.now() });
    });
  <\/script>
</body>
</html>`
}

function escapeHtmlForTemplate(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char))
}

async function createOrOpenHtmlUiAsset() {
  if (runtime.isPlaying || !ui.value || !entity.value) return
  if (!window.unu?.openCodeEditor) {
    project.setStatus('当前环境未接入代码编辑器窗口。')
    return
  }
  ui.value.renderMode = 'html'
  ui.value.htmlUseIframe = true
  ui.value.htmlAllowScripts = true
  ui.value.htmlBridgeEnabled = true

  let relativePath = String(ui.value.htmlSourcePath || '').replace(/\\/g, '/').trim()
  let filePath = ''
  let content = ''
  if (!relativePath) {
    const safeName = (entity.value.name || entity.value.id || 'ui').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'ui'
    relativePath = `assets/ui/${safeName}.html`
    content = createDefaultHtmlUiTemplate(ui.value, entity.value.name || entity.value.id)
    if (ui.value.htmlAutoCreateAsset && window.unu?.saveTextAsset && project.rootPath && !project.isMemoryProject) {
      try {
        const saved = await window.unu.saveTextAsset({
          content,
          suggestedName: fileNameOf(relativePath),
          projectRoot: project.rootPath,
          subdir: directoryOf(relativePath),
          title: '创建 HTML UI',
          filterName: 'HTML'
        })
        if (saved?.relativePath) {
          relativePath = saved.relativePath
          filePath = saved.filePath
          await assets.refreshProject()
          await assets.selectAsset(relativePath)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        project.setStatus(`创建 HTML UI 文件失败：${message}`)
      }
    }
    ui.value.htmlSourcePath = relativePath
    ui.value.text = content
    sceneStore.markDirty()
  } else if (window.unu?.readTextAsset && project.rootPath && !project.isMemoryProject && relativePath.startsWith('assets/')) {
    try {
      const result = await window.unu.readTextAsset({ projectRoot: project.rootPath, relativePath })
      content = result?.content || ''
      filePath = result?.filePath || ''
      relativePath = result?.relativePath || relativePath
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      project.setStatus(`读取 HTML UI 失败：${message}`)
    }
  }
  if (!content) content = ui.value.text || createDefaultHtmlUiTemplate(ui.value, entity.value.name || entity.value.id)

  htmlUiCodeEditorSessionId = `html_ui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  htmlUiCodeEditorEntityId = entity.value.id
  htmlUiCodeEditorFilePath = filePath
  htmlUiCodeEditorRelativePath = relativePath
  htmlUiCodeEditorContent = content

  const result = await window.unu.openCodeEditor({
    id: htmlUiCodeEditorSessionId,
    mode: 'html-ui-asset',
    title: `${entity.value.name || 'UI'} HTMLoverlayer`,
    path: htmlUiCodeEditorRelativePath || 'inline://html-ui',
    language: 'html',
    content
  })
  if (!result?.ok) {
    project.setStatus(`打开 HTML UI 代码窗口失败：${result?.error || '未知错误'}`)
    return
  }
  project.setStatus('已打开 HTMLoverlayer 代码窗口')
}

async function openInteractionCodeEditor() {
  if (runtime.isPlaying) return
  if (!entity.value || !interactable.value) return
  if (!window.unu?.openCodeEditor) {
    project.setStatus('当前环境未接入代码编辑器窗口，请使用桌面版运行。')
    return
  }
  if (!script.value) ensureInteractionScript()
  const targetScript = entity.value.getComponent<ScriptComponent>('Script')
  if (!targetScript) {
    project.setStatus('创建交互脚本失败：当前实体没有 Script 组件。')
    return
  }

  interactionCodeEditorSessionId = `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  interactionCodeEditorEntityId = entity.value.id
  interactionCodeEditorFilePath = ''
  interactionCodeEditorRelativePath = targetScript.scriptPath || 'custom://interaction'
  let content = targetScript.sourceCode || ''
  let mode = 'interaction-entity'

  if (isProjectAssetScriptPath(interactionCodeEditorRelativePath)) {
    mode = 'interaction-asset'
    if (!window.unu?.readTextAsset || !project.rootPath) {
      project.setStatus('当前环境无法读取项目脚本文件。')
      return
    }
    try {
      const result = await window.unu.readTextAsset({
        projectRoot: project.rootPath,
        relativePath: interactionCodeEditorRelativePath
      })
      if (!result) {
        project.setStatus(`读取交互代码失败：${interactionCodeEditorRelativePath}`)
        return
      }
      interactionCodeEditorFilePath = result.filePath
      interactionCodeEditorRelativePath = result.relativePath || interactionCodeEditorRelativePath
      content = result.content
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      project.setStatus(`读取交互代码失败：${message}`)
      return
    }
  }

  const result = await window.unu.openCodeEditor({
    id: interactionCodeEditorSessionId,
    mode,
    title: `${entity.value.name || entity.value.id} Interaction`,
    path: interactionCodeEditorRelativePath,
    language: guessInteractionEditorLanguage(interactionCodeEditorRelativePath),
    content
  }) as { ok: boolean; error?: string; locked?: boolean } | null
  if (!result?.ok) {
    project.setStatus(`打开交互代码窗口失败：${result?.error || '未知错误'}`)
    return
  }
  if (result.locked) {
    interactionCodeEditorSessionId = ''
    interactionCodeEditorEntityId = ''
    interactionCodeEditorFilePath = ''
    interactionCodeEditorRelativePath = ''
    interactionCodeEditorContent = ''
    project.setStatus('已有独立代码编辑窗口正在编辑，请先关闭该窗口再打开交互代码。')
    return
  }
  interactionCodeEditorContent = content
  project.setStatus('已打开交互代码独立窗口')
}

function applyInteractionCodeEditorPayload(raw: unknown) {
  const payload = (raw || {}) as CodeEditorApplyPayload
  if (payload.mode === 'html-ui-asset') {
    if (payload.id && htmlUiCodeEditorSessionId && payload.id !== htmlUiCodeEditorSessionId) return
    htmlUiCodeEditorContent = String(payload.content ?? '')
    const targetEntity = sceneStore.scenes
      .map((scene) => scene.getEntityById(htmlUiCodeEditorEntityId))
      .find(Boolean)
    const targetUi = targetEntity?.getComponent<UIComponent>('UI')
    if (!targetUi) {
      project.setStatus('HTML UI 内容未应用：原实体或 UI 组件已不存在。')
      return
    }
    targetUi.renderMode = 'html'
    targetUi.htmlSourcePath = htmlUiCodeEditorRelativePath || targetUi.htmlSourcePath
    targetUi.htmlPreviewContent = htmlUiCodeEditorContent
    if (!targetUi.htmlSourcePath) targetUi.text = htmlUiCodeEditorContent
    sceneStore.markDirty()
    if (payload.saveRequested) void saveHtmlUiAssetFromEditor()
    return
  }

  if (payload.mode === 'inspector-entity-script') {
    if (payload.id && entityScriptCodeEditorSessionId && payload.id !== entityScriptCodeEditorSessionId) return
    const targetEntity = sceneStore.scenes
      .map((scene) => scene.getEntityById(entityScriptCodeEditorEntityId))
      .find(Boolean)
    const targetScript = targetEntity?.getComponent<ScriptComponent>('Script')
    if (!targetScript) {
      project.setStatus('代码窗口内容未应用：原实体或 Script 组件已不存在。')
      return
    }
    targetScript.sourceCode = String(payload.content ?? '')
    targetScript.instance = null
    targetScript.initialized = false
    targetScript.started = false
    sceneStore.markDirty()
    if (payload.saveRequested) {
      project.setStatus('实体脚本配置已保存到当前场景状态，请保存场景/项目以写入文件。')
    }
    return
  }

  if (!payload.mode?.startsWith('interaction-')) return
  if (payload.id && interactionCodeEditorSessionId && payload.id !== interactionCodeEditorSessionId) return
  interactionCodeEditorContent = String(payload.content ?? '')

  if (payload.mode === 'interaction-entity') {
    const targetEntity = sceneStore.currentScene?.getEntityById(interactionCodeEditorEntityId)
    const targetScript = targetEntity?.getComponent<ScriptComponent>('Script')
    if (targetScript) {
      targetScript.sourceCode = interactionCodeEditorContent
      sceneStore.markDirty()
    }
    if (payload.saveRequested) project.setStatus('交互脚本已保存到当前场景状态，请保存场景/项目以写入文件。')
    return
  }

  if (payload.mode === 'interaction-asset' && payload.saveRequested) {
    void saveInteractionAssetFromEditor()
  }
}

async function saveInteractionAssetFromEditor() {
  if (!window.unu?.saveTextAsset || !project.rootPath || !interactionCodeEditorRelativePath) {
    project.setStatus('当前环境无法保存交互代码文件。')
    return
  }
  try {
    const saved = await window.unu.saveTextAsset({
      filePath: interactionCodeEditorFilePath || undefined,
      content: interactionCodeEditorContent,
      suggestedName: fileNameOf(interactionCodeEditorRelativePath),
      projectRoot: project.rootPath,
      subdir: directoryOf(interactionCodeEditorRelativePath),
      title: '保存交互代码',
      filterName: 'Script'
    })
    if (!saved) {
      project.setStatus('已取消保存交互代码。')
      return
    }
    interactionCodeEditorFilePath = saved.filePath
    interactionCodeEditorRelativePath = saved.relativePath || interactionCodeEditorRelativePath
    project.setStatus(`交互代码已保存：${saved.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`保存交互代码失败：${message}`)
  }
}

async function saveHtmlUiAssetFromEditor() {
  if (!window.unu?.saveTextAsset || !project.rootPath || !htmlUiCodeEditorRelativePath) {
    project.setStatus('当前环境无法保存 HTML UI 文件。')
    return
  }
  try {
    const saved = await window.unu.saveTextAsset({
      filePath: htmlUiCodeEditorFilePath || undefined,
      content: htmlUiCodeEditorContent,
      suggestedName: fileNameOf(htmlUiCodeEditorRelativePath),
      projectRoot: project.rootPath,
      subdir: directoryOf(htmlUiCodeEditorRelativePath),
      title: '保存 HTML UI',
      filterName: 'HTML'
    })
    if (!saved) {
      project.setStatus('已取消保存 HTML UI。')
      return
    }
    htmlUiCodeEditorFilePath = saved.filePath
    htmlUiCodeEditorRelativePath = saved.relativePath || htmlUiCodeEditorRelativePath
    const targetEntity = sceneStore.scenes
      .map((scene) => scene.getEntityById(htmlUiCodeEditorEntityId))
      .find(Boolean)
    const targetUi = targetEntity?.getComponent<UIComponent>('UI')
    if (targetUi) {
      targetUi.htmlSourcePath = htmlUiCodeEditorRelativePath
      targetUi.htmlPreviewContent = ''
      sceneStore.markDirty()
    }
    await assets.refreshProject()
    project.setStatus(`HTML UI 已保存：${saved.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    project.setStatus(`保存 HTML UI 失败：${message}`)
  }
}

function handleInteractionCodeEditorClosed(raw: unknown) {
  const payload = (raw || {}) as CodeEditorApplyPayload
  if (payload.mode === 'html-ui-asset') {
    if (payload.id && htmlUiCodeEditorSessionId && payload.id !== htmlUiCodeEditorSessionId) return
    htmlUiCodeEditorSessionId = ''
    htmlUiCodeEditorEntityId = ''
    htmlUiCodeEditorFilePath = ''
    htmlUiCodeEditorRelativePath = ''
    htmlUiCodeEditorContent = ''
    return
  }

  if (payload.mode === 'inspector-entity-script') {
    if (payload.id && entityScriptCodeEditorSessionId && payload.id !== entityScriptCodeEditorSessionId) return
    editor.unlockScriptEditorExternal(payload.id)
    entityScriptCodeEditorSessionId = ''
    entityScriptCodeEditorEntityId = ''
    return
  }

  if (!payload.mode?.startsWith('interaction-')) return
  if (payload.id && interactionCodeEditorSessionId && payload.id !== interactionCodeEditorSessionId) return
  interactionCodeEditorSessionId = ''
  interactionCodeEditorEntityId = ''
  interactionCodeEditorFilePath = ''
  interactionCodeEditorRelativePath = ''
  interactionCodeEditorContent = ''
}

function setAnimationFrames(event: Event) {
  if (runtime.isPlaying) return
  if (!animation.value) return
  animation.value.framePaths = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  sceneStore.markDirty()
}

function setBackgroundFitMode(event: Event) {
  if (runtime.isPlaying) return
  if (!background.value) return
  const value = (event.target as HTMLSelectElement).value
  background.value.fitMode = value === 'contain' ? 'contain' : 'cover'
  sceneStore.markDirty()
}

function addBackgroundComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || background.value) return
  entity.value.addComponent(new BackgroundComponent(true, true, 'cover'))
  if (!sprite.value) {
    entity.value.addComponent(new SpriteComponent('assets/images/pixel/background/background-img.png', 1539, 1022, true, 1, 0xffffff, false))
  }
  sceneStore.markDirty()
}

function ensureAnimationStateMachineDefaults() {
  if (!animation.value) return
  if (!animation.value.stateMachine.clips.length) {
    animation.value.stateMachine.clips = [
      {
        name: 'Idle',
        framePaths: [...animation.value.framePaths],
        frameDurations: animation.value.framePaths.map((_, index) => Math.max(1, Number(animation.value?.frameDurations[index] ?? 1))),
        loop: true
      },
      { name: 'Run', framePaths: [], frameDurations: [], loop: true },
      { name: 'Attack', framePaths: [], frameDurations: [], loop: false }
    ]
  }
  if (!animation.value.stateMachine.transitions.length) {
    animation.value.stateMachine.transitions = [
      { from: 'Idle', to: 'Run', condition: 'ifMoving' },
      { from: 'Run', to: 'Idle', condition: 'ifNotMoving' },
      { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
      { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
      { from: 'Attack', to: 'Run', condition: 'ifActionUp', action: 'fire', minNormalizedTime: 0.6, exitTime: true }
    ]
  }
}

function setAnimationStateMachineEnabled(event: Event) {
  if (!animation.value) return
  animation.value.stateMachine.enabled = (event.target as HTMLInputElement).checked
  if (animation.value.stateMachine.enabled) {
    ensureAnimationStateMachineDefaults()
    if (!animation.value.stateMachine.initialState) animation.value.stateMachine.initialState = 'Idle'
    if (!animation.value.stateMachine.currentState) animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  }
  sceneStore.markDirty()
}

function setAnimationStateInitial(event: Event) {
  if (!animation.value) return
  animation.value.stateMachine.initialState = (event.target as HTMLInputElement).value.trim() || 'Idle'
  if (!animation.value.stateMachine.currentState) animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  sceneStore.markDirty()
}

function getAnimationStateAction() {
  if (!animation.value) return 'fire'
  const hit = animation.value.stateMachine.transitions.find((item) => item.condition === 'ifActionDown' || item.condition === 'ifActionUp')
  return hit?.action || 'fire'
}

function setAnimationStateAction(event: Event) {
  if (!animation.value) return
  const action = (event.target as HTMLInputElement).value.trim() || 'fire'
  ensureAnimationStateMachineDefaults()
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item) =>
    item.condition === 'ifActionDown' || item.condition === 'ifActionUp' ? { ...item, action } : item
  )
  sceneStore.markDirty()
}

function ensureAnimationStateClip(name: string) {
  if (!animation.value) return null
  let clip = animation.value.stateMachine.clips.find((item) => item.name === name) || null
  if (!clip) {
    clip = { name, framePaths: [], frameDurations: [], loop: name !== 'Attack' }
    animation.value.stateMachine.clips = [...animation.value.stateMachine.clips, clip]
  }
  return clip
}

function getAnimationStateClipText(name: string) {
  const clip = animation.value?.stateMachine.clips.find((item) => item.name === name)
  return clip?.framePaths.join('\n') || ''
}

function setAnimationStateClipText(name: string, event: Event) {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const clip = ensureAnimationStateClip(name)
  if (!clip) return
  clip.framePaths = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  clip.frameDurations = clip.framePaths.map((_, index) => Math.max(1, Number(clip.frameDurations[index] ?? 1)))
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === name ? clip : item)
  sceneStore.markDirty()
}

function addAnimationState() {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const name = newAnimationStateName.value.trim()
  if (!name) return
  if (animation.value.stateMachine.clips.some((clip) => clip.name === name)) return
  animation.value.stateMachine.clips = [
    ...animation.value.stateMachine.clips,
    { name, framePaths: [], frameDurations: [], loop: true }
  ]
  if (!animation.value.stateMachine.initialState) animation.value.stateMachine.initialState = name
  selectedAnimationStateName.value = name
  newAnimationStateName.value = ''
  sceneStore.markDirty()
}

function selectAnimationState(name: string) {
  selectedAnimationStateName.value = name
}

function removeAnimationState(name: string) {
  if (!animation.value) return
  if (animation.value.stateMachine.clips.length <= 1) return
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.filter((clip) => clip.name !== name)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.filter((item) => item.from !== name && item.to !== name)
  if (animation.value.stateMachine.initialState === name) {
    animation.value.stateMachine.initialState = animation.value.stateMachine.clips[0]?.name || 'Idle'
  }
  if (animation.value.stateMachine.currentState === name) {
    animation.value.stateMachine.currentState = animation.value.stateMachine.initialState
  }
  if (selectedAnimationStateName.value === name) {
    selectedAnimationStateName.value = animation.value.stateMachine.clips[0]?.name || ''
  }
  sceneStore.markDirty()
}

function setSelectedAnimationStateName(event: Event) {
  if (!animation.value) return
  const raw = (event.target as HTMLInputElement).value.trim()
  if (!raw) return
  const clip = animation.value.stateMachine.clips.find((item) => item.name === selectedAnimationStateName.value)
  if (!clip) return
  if (raw !== clip.name && animation.value.stateMachine.clips.some((item) => item.name === raw)) return
  const previous = clip.name
  clip.name = raw
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item === clip ? { ...clip } : item)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item) => ({
    ...item,
    from: item.from === previous ? raw : item.from,
    to: item.to === previous ? raw : item.to
  }))
  if (animation.value.stateMachine.initialState === previous) animation.value.stateMachine.initialState = raw
  if (animation.value.stateMachine.currentState === previous) animation.value.stateMachine.currentState = raw
  selectedAnimationStateName.value = raw
  sceneStore.markDirty()
}

function selectedAnimationStateClip() {
  if (!animation.value) return null
  return animation.value.stateMachine.clips.find((item) => item.name === selectedAnimationStateName.value) || null
}

function getSelectedAnimationStateFrameText() {
  return selectedAnimationStateClip()?.framePaths.join('\n') || ''
}

function setSelectedAnimationStateFrameText(event: Event) {
  const clip = selectedAnimationStateClip()
  if (!animation.value || !clip) return
  clip.framePaths = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => line.trim()).filter(Boolean)
  clip.frameDurations = clip.framePaths.map((_, index) => Math.max(1, Number(clip.frameDurations[index] ?? 1)))
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === clip.name ? clip : item)
  sceneStore.markDirty()
}

function getSelectedAnimationStateDurationText() {
  const clip = selectedAnimationStateClip()
  if (!clip) return ''
  return clip.framePaths.map((_, index) => Math.max(1, Number(clip.frameDurations[index] ?? 1))).join('\n')
}

function setSelectedAnimationStateDurationText(event: Event) {
  const clip = selectedAnimationStateClip()
  if (!animation.value || !clip) return
  const values = (event.target as HTMLTextAreaElement).value.split('\n').map((line) => Math.max(1, Number(line.trim() || 1)))
  clip.frameDurations = clip.framePaths.map((_, index) => Math.max(1, Number(values[index] ?? 1)))
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === clip.name ? clip : item)
  sceneStore.markDirty()
}

function setSelectedAnimationStateLoop(event: Event) {
  const clip = selectedAnimationStateClip()
  if (!animation.value || !clip) return
  clip.loop = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.clips = animation.value.stateMachine.clips.map((item) => item.name === clip.name ? clip : item)
  sceneStore.markDirty()
}

function addAnimationTransition() {
  if (!animation.value) return
  ensureAnimationStateMachineDefaults()
  const fallback = animation.value.stateMachine.clips[0]?.name || 'Idle'
  animation.value.stateMachine.transitions = [
    ...animation.value.stateMachine.transitions,
    { from: fallback, to: fallback, condition: 'always' }
  ]
  sceneStore.markDirty()
}

function removeAnimationTransition(index: number) {
  if (!animation.value) return
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.filter((_, i) => i !== index)
  sceneStore.markDirty()
}

function setAnimationTransitionFrom(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, from: value } : item)
  sceneStore.markDirty()
}

function setAnimationTransitionTo(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, to: value } : item)
  sceneStore.markDirty()
}

function setAnimationTransitionCondition(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLSelectElement).value as 'always' | 'ifMoving' | 'ifNotMoving' | 'ifActionDown' | 'ifActionUp'
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) => i === index ? { ...item, condition: value } : item)
  sceneStore.markDirty()
}

function setAnimationTransitionAction(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).value.trim()
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, action: value || undefined } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionPriority(index: number, event: Event) {
  if (!animation.value) return
  const value = Number((event.target as HTMLInputElement).value || 0)
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, priority: Number.isFinite(value) ? value : 0 } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionCanInterrupt(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, canInterrupt: value } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionOnce(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, once: value } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionMinNormalizedTime(index: number, event: Event) {
  if (!animation.value) return
  const raw = Number((event.target as HTMLInputElement).value || 0)
  const value = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0))
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, minNormalizedTime: value } : item
  )
  sceneStore.markDirty()
}

function setAnimationTransitionExitTime(index: number, event: Event) {
  if (!animation.value) return
  const value = (event.target as HTMLInputElement).checked
  animation.value.stateMachine.transitions = animation.value.stateMachine.transitions.map((item, i) =>
    i === index ? { ...item, exitTime: value } : item
  )
  sceneStore.markDirty()
}

async function applySelectedImage() {
  if (runtime.isPlaying) return
  if (!sprite.value || assets.selectedAsset?.type !== 'image') return
  sprite.value.texturePath = assets.selectedAsset.path
  const imageSize = await assets.ensureImageSize(assets.selectedAsset.path)
  if (imageSize) {
    const fitScale = Math.min(1, 192 / Math.max(imageSize.width, imageSize.height))
    sprite.value.width = Math.max(24, Math.round(imageSize.width * fitScale))
    sprite.value.height = Math.max(24, Math.round(imageSize.height * fitScale))
  }
  sceneStore.markDirty()
}

async function openSpriteAtlasEditorForSelection() {
  if (!window.unu?.openSpriteAtlasEditor || !project.rootPath) {
    project.setStatus('精灵图集编辑器需要在支持文件接口的工程中使用。')
    return
  }
  const payload = {
    projectRoot: project.rootPath,
    imagePath: selectedImageAssetPath.value || (sprite.value?.texturePath && !sprite.value.texturePath.startsWith('atlas://') ? sprite.value.texturePath : undefined),
    atlasPath: selectedAtlasAssetPath.value || animation.value?.sourceAtlasPath || undefined
  }
  if (!payload.imagePath && !payload.atlasPath) {
    project.setStatus('请先选择图片或 .atlas.json，或让 Sprite 绑定一张普通图片。')
    return
  }
  const result = await window.unu.openSpriteAtlasEditor(payload)
  if (!result?.ok) project.setStatus(`打开精灵图集编辑器失败：${result?.error || '未知错误'}`)
}

function appendSelectedImageToAnimation() {
  if (runtime.isPlaying) return
  if (!animation.value || assets.selectedAsset?.type !== 'image') return
  animation.value.framePaths = [...animation.value.framePaths, assets.selectedAsset.path]
  sceneStore.markDirty()
}

function addSpriteComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || sprite.value) return
  entity.value.addComponent(new SpriteComponent('', 80, 80, true, 1, 0xffffff, true))
  sceneStore.markDirty()
}

function addAnimationComponent() {
  if (runtime.isPlaying) return
  if (!entity.value) return
  entity.value.addComponent(
    new AnimationComponent(
      true,
      true,
      8,
      true,
      0,
      0,
      [],
      [],
      '',
      '',
      null,
      [],
      { positionX: [], positionY: [], rotation: [] },
      {
        enabled: false,
        initialState: 'Idle',
        currentState: '',
        clips: [
          { name: 'Idle', framePaths: [], frameDurations: [], loop: true },
          { name: 'Run', framePaths: [], frameDurations: [], loop: true },
          { name: 'Attack', framePaths: [], frameDurations: [], loop: false }
        ],
        transitions: [
          { from: 'Idle', to: 'Run', condition: 'ifMoving' },
          { from: 'Run', to: 'Idle', condition: 'ifNotMoving' },
          { from: 'Idle', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Run', to: 'Attack', condition: 'ifActionDown', action: 'fire' },
          { from: 'Attack', to: 'Run', condition: 'ifActionUp', action: 'fire', minNormalizedTime: 0.6, exitTime: true }
        ]
      }
    )
  )
  sceneStore.markDirty()
}

function parseTilemapText(text: string, rows: number, cols: number) {
  const lines = text.split('\n')
  const array: number[] = []
  for (let r = 0; r < rows; r += 1) {
    const rowText = (lines[r] || '').trim()
    const values = rowText ? rowText.split(',').map((v) => Number(v.trim() || 0)) : []
    for (let c = 0; c < cols; c += 1) {
      const value = Number(values[c] ?? 0)
      array.push(Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0)
    }
  }
  return array
}

function applyTilemapBuffer(kind: 'tiles' | 'collision') {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  const source = kind === 'tiles' ? tilemapTilesBuffer.value : tilemapCollisionBuffer.value
  const parsed = parseTilemapText(source, tilemap.value.rows, tilemap.value.columns)
  if (kind === 'tiles') tilemap.value.tiles = parsed
  else tilemap.value.collision = parsed
  sceneStore.markDirty()
}

function resizeTilemapData() {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  tilemap.value.columns = Math.max(1, Math.round(tilemap.value.columns))
  tilemap.value.rows = Math.max(1, Math.round(tilemap.value.rows))
  tilemap.value.tileWidth = Math.max(8, Math.round(tilemap.value.tileWidth))
  tilemap.value.tileHeight = Math.max(8, Math.round(tilemap.value.tileHeight))
  const size = tilemap.value.columns * tilemap.value.rows
  tilemap.value.tiles = normalizeTileArray(tilemap.value.tiles, size)
  tilemap.value.collision = normalizeTileArray(tilemap.value.collision, size)
  tilemapTilesBuffer.value = tilemapToText(tilemap.value.tiles)
  tilemapCollisionBuffer.value = tilemapToText(tilemap.value.collision)
  sceneStore.markDirty()
}

function tilemapToText(values: number[] | undefined) {
  if (!tilemap.value) return ''
  const cols = tilemap.value.columns
  const rows = tilemap.value.rows
  const safe = normalizeTileArray(values || [], cols * rows)
  const lines: string[] = []
  for (let r = 0; r < rows; r += 1) lines.push(safe.slice(r * cols, (r + 1) * cols).join(','))
  return lines.join('\n')
}

function normalizeTileArray(values: number[], size: number) {
  const next = values.slice(0, size).map((v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0))
  while (next.length < size) next.push(0)
  return next
}

function tileTextureMapToText(map: Record<number, string> | undefined) {
  const source = map || {}
  return Object.keys(source)
    .map((key) => Number(key))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
    .map((value) => `${value}=${String(source[value] || '').trim()}`)
    .join('\n')
}

function applyTileTextureMapBuffer() {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  const map: Record<number, string> = {}
  for (const rawLine of tileTextureMapBuffer.value.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const [left, ...rest] = line.split('=')
    const value = Math.round(Number(left.trim()))
    const path = rest.join('=').trim()
    if (!Number.isFinite(value) || value <= 0 || !path) continue
    map[value] = path
  }
  tilemap.value.tileTextureMap = map
  sceneStore.markDirty()
}

function bindSelectedImageToTileValue() {
  if (runtime.isPlaying) return
  if (!tilemap.value) return
  if (assets.selectedAsset?.type !== 'image') {
    project.setStatus('请先在资源树中选中一张图片。')
    return
  }
  const value = Math.round(Number(tileTextureBindValueInput.value))
  if (!Number.isFinite(value) || value <= 0) {
    project.setStatus('请输入有效的 Tile 数值（正整数）。')
    return
  }
  tilemap.value.tileTextureMap = { ...(tilemap.value.tileTextureMap || {}), [value]: assets.selectedAsset.path }
  tileTextureMapBuffer.value = tileTextureMapToText(tilemap.value.tileTextureMap)
  sceneStore.markDirty()
  project.setStatus(`已绑定 Tile 值 ${value} -> ${assets.selectedAsset.path}`)
}

async function applySelectedImageToBackground() {
  if (runtime.isPlaying) return
  if (assets.selectedAsset?.type !== 'image') return
  if (!entity.value) return
  if (!sprite.value) {
    entity.value.addComponent(new SpriteComponent(assets.selectedAsset.path, 1539, 1022, true, 1, 0xffffff, false))
  } else {
    sprite.value.texturePath = assets.selectedAsset.path
  }
  if (!background.value) {
    entity.value.addComponent(new BackgroundComponent(true, true, 'cover'))
  }
  sceneStore.markDirty()
}

async function openTilemapEditor(mode: 'tiles' | 'collision') {
  if (runtime.isPlaying) return
  if (!tilemap.value || !entity.value) return
  if (!window.unu?.openTilemapEditor) {
    project.setStatus('当前环境未接入 Tilemap 子窗口编辑器，请使用桌面版运行。')
    return
  }
  const result = await window.unu.openTilemapEditor({
    entityId: entity.value.id,
    entityName: entity.value.name,
    projectRoot: project.rootPath,
    mode,
    columns: tilemap.value.columns,
    rows: tilemap.value.rows,
    tileWidth: tilemap.value.tileWidth,
    tileHeight: tilemap.value.tileHeight,
    tiles: [...tilemap.value.tiles],
    collision: [...tilemap.value.collision],
    tileTextureMap: { ...(tilemap.value.tileTextureMap || {}) }
  })
  if (!result?.ok) {
    project.setStatus(`打开 Tilemap 图形窗口失败：${result?.error || '未知错误'}`)
    return
  }
  project.setStatus(`已打开 Tilemap 图形窗口：${mode === 'tiles' ? 'Tiles' : 'Collision'}`)
}

function addTilemapComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || tilemap.value) return
  entity.value.addComponent(new TilemapComponent(true, 12, 8, 48, 48))
  sceneStore.markDirty()
}

function addColliderComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || collider.value) return
  entity.value.addComponent(new ColliderComponent('rect', 80, 80, 0, 0, false, 'Default', [...DEFAULT_COLLISION_MASKS.Default], true, 80, 40, 120, 0))
  sceneStore.markDirty()
}

function addPhysicsBodyComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || physicsBody.value) return
  entity.value.addComponent(new PhysicsBodyComponent('dynamic', 1, true, 0.08))
  sceneStore.markDirty()
}

function setUIMode(event: Event) {
  if (runtime.isPlaying) return
  if (!ui.value) return
  const value = (event.target as HTMLSelectElement).value
  ui.value.mode = value === 'button' || value === 'slider' ? value : 'text'
  sceneStore.markDirty()
}

function setUIRenderMode(event: Event) {
  if (runtime.isPlaying) return
  if (!ui.value) return
  ui.value.renderMode = (event.target as HTMLSelectElement).value === 'html' ? 'html' : 'pixi'
  sceneStore.markDirty()
}

function setUILayout(event: Event) {
  if (runtime.isPlaying) return
  if (!ui.value) return
  const value = (event.target as HTMLSelectElement).value
  ui.value.layout = value === 'vertical' || value === 'horizontal' ? value : 'none'
  sceneStore.markDirty()
}

function bindSelectedScriptToUIButton() {
  if (runtime.isPlaying) return
  if (!ui.value || (ui.value.mode !== 'button' && ui.value.mode !== 'slider') || !selectedScriptAssetPath.value) return
  ui.value.onClickScriptPath = selectedScriptAssetPath.value
  sceneStore.markDirty()
  project.setStatus(`已绑定 UI ${ui.value.mode === 'slider' ? 'Slider' : 'Button'} 脚本：${selectedScriptAssetPath.value}`)
}

function addUIComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || ui.value) return
  entity.value.addComponent(new UIComponent(true, 'text', 'UI Text', 20, 0xffffff, 180, 48, 0x2b3242, 0.5, 0.5, true))
  sceneStore.markDirty()
}

function setAudioGroup(event: Event) {
  if (runtime.isPlaying) return
  if (!audio.value) return
  const next = (event.target as HTMLSelectElement).value
  audio.value.group = next === 'bgm' || next === 'ui' ? next : 'sfx'
  sceneStore.markDirty()
}

async function applySelectedAudio() {
  if (runtime.isPlaying) return
  if (!audio.value || assets.selectedAsset?.type !== 'audio') return
  audio.value.clipPath = assets.selectedAsset.path
  sceneStore.markDirty()
}

function addAudioComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || audio.value) return
  entity.value.addComponent(new AudioComponent(true, '', 'sfx', 1, false, false, false, false, 1, 0, 0))
  sceneStore.markDirty()
}

function addCameraComponent() {
  if (runtime.isPlaying) return
  if (!entity.value || camera.value) return
  entity.value.addComponent(new CameraComponent(true, 1, '', 0.18, 0, 0, false))
  sceneStore.markDirty()
}
</script>

<style scoped>
.inspector { display: grid; gap: 12px; min-width: 0; width: 100%; }
h3 { margin: 0; }
.group { padding: 12px; border-radius: 10px; background: #1a2030; display: grid; gap: 8px; min-width: 0; width: 100%; box-sizing: border-box; transition: all ease-in-out 0.1s; }
.group:hover { background: #202637; }
.component-shell {
  position: relative;
  display: grid;
  gap: 8px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(94, 112, 143, 0.28);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(30, 38, 55, 0.96), rgba(20, 26, 39, 0.96));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  overflow: hidden;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
  animation: componentPanelIn 180ms ease both;
}
.component-shell:hover {
  transform: translateY(-1px);
  border-color: rgba(112, 139, 178, 0.46);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}
.component-shell.collapsed {
  background: linear-gradient(135deg, rgba(26, 33, 48, 0.92), rgba(18, 24, 36, 0.92));
}
.component-shell-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
}
.component-shell-header.inline {
  padding: 0 0 4px;
}
.component-shell-header strong {
  display: block;
  color: #e7eef9;
  font-size: 13px;
}
.component-shell-header span {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: #8fa3bf;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.collapse-toggle {
  width: 24px;
  height: 24px;
  border: 1px solid #303848;
  border-radius: 8px;
  background: #171e2b;
  color: #dce7f5;
  cursor: pointer;
}
.component-shell-content {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 0 12px 12px;
}
.component-shell-content.inline {
  padding: 0;
}
.component-shell-content :deep(.group) {
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.component-shell-content :deep(.group:hover) {
  background: transparent;
}
.component-shell-content :deep(.group > .group-title) {
  display: none;
}
.component-list-move,
.component-list-enter-active,
.component-list-leave-active {
  transition: all 200ms ease;
}
.component-list-enter-from,
.component-list-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.99);
}
.inactive-components {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.inactive-title {
  color: #91a8c6;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.inactive-component-card {
  position: relative;
  display: grid;
  grid-template-columns: 2px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-width: 0;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(69, 82, 108, 0.45);
  border-radius: 12px;
  background: rgba(17, 23, 34, 0.52);
  color: #dce7f5;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}
.inactive-component-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(111, 167, 220, 0.6), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01));
  filter: blur(0.1px);
  opacity: 0.55;
}
.inactive-component-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(112, 157, 221, 0.68);
  background: rgba(24, 33, 49, 0.74);
}
.inactive-component-card:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.inactive-visual {
  position: relative;
  width: 2px;
  height: 32px;
  border-radius: 10px;
  background: rgba(10, 14, 22, 0);
  box-shadow: inset 0 0 0 1px rgba(159, 184, 220, 0.16);
  backdrop-filter: blur(4px);
}
.inactive-copy {
  position: relative;
  display: grid;
  gap: 3px;
  min-width: 0;
}
.inactive-copy strong {
  font-size: 13px;
}
.inactive-copy span {
  overflow: hidden;
  color: #91a4bd;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inactive-action {
  position: relative;
  color: #9bd4ff;
  font-size: 12px;
  white-space: nowrap;
}
.custom-component-shell {
  border-color: rgba(92, 138, 118, 0.42);
}
.custom-component-add {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 1px dashed rgba(117, 142, 178, 0.42);
  border-radius: 12px;
  background: rgba(17, 23, 34, 0.55);
}
.custom-component-add strong {
  display: block;
  color: #dbe7f5;
  font-size: 13px;
}
.custom-component-add span {
  color: #8fa3bf;
  font-size: 12px;
}
.inventory-editor {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(92, 138, 118, 0.26);
  border-radius: 12px;
  background: rgba(11, 17, 25, 0.34);
}
.inventory-editor-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.inventory-editor-header strong {
  display: block;
  color: #e6f5ee;
  font-size: 13px;
}
.inventory-editor-header span {
  display: block;
  overflow: hidden;
  color: #8bb8a3;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inventory-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}
.inventory-slot-grid {
  display: grid;
  gap: 6px;
  min-width: 0;
  max-height: 260px;
  padding: 6px;
  border: 1px solid rgba(64, 78, 101, 0.56);
  border-radius: 10px;
  background: rgba(7, 11, 17, 0.48);
  overflow: auto;
}
.inventory-slot-card {
  position: relative;
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 7px;
  border: 1px solid rgba(64, 91, 80, 0.56);
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(20, 33, 28, 0.86), rgba(13, 19, 28, 0.86));
}
.inventory-slot-card input {
  padding: 7px;
  font-size: 12px;
}
.inventory-slot-index {
  color: #7ed0a6;
  font-size: 11px;
  letter-spacing: 0.03em;
}
.inventory-actions {
  align-items: center;
}
@keyframes componentPanelIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.subgroup { border: 1px solid #2b3344; border-radius: 8px; padding: 8px; display: grid; gap: 8px; background: #161d2a; min-width: 0; width: 100%; box-sizing: border-box; }
.group-title { color: #9bb0c9; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; min-width: 0; width: 100%; }
input:not([type='checkbox']), textarea, select {
  background: #0f141d;
  color: #ecf0f7;
  border: 1px solid #313a4a;
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
textarea { min-height: 96px; resize: vertical; }
.color-field {
  display: grid;
  grid-template-columns: minmax(96px, 0.65fr) minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
}
.color-field input[type='color'] {
  height: 36px;
  padding: 3px;
  cursor: pointer;
}
.alpha-field span {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.alpha-field input[type='range'] {
  width: 100%;
  min-width: 0;
}
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.html-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  min-width: 0;
}
.html-option-grid .checkbox-row {
  padding: 7px 8px;
  border: 1px solid #2a3446;
  border-radius: 8px;
  background: #131b28;
  font-size: 12px;
}
.collision-mask {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
  padding: 8px;
  border: 1px solid #2a3446;
  border-radius: 8px;
  background: #131b28;
}
.collision-mask .mini-title {
  grid-column: 1 / -1;
  color: #8fa3bf;
  font-size: 12px;
}
.collision-mask .checkbox-row {
  font-size: 12px;
}
.readonly, .empty, .tips { color: #a8b5c7; }
.asset-picker {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #9bb0c9;
  min-width: 0;
  width: 100%;
}
.asset-picker .tile-bind-input {
  width: 88px;
  min-width: 88px;
  max-width: 88px;
  padding: 6px 8px;
}
.asset-picker span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.script-link-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 8px;
  border: 1px solid #2a3446;
  border-radius: 8px;
  background: #131b28;
}
.script-link-card strong {
  display: block;
  color: #dbe7f5;
  font-size: 12px;
  margin-bottom: 3px;
}
.script-link-card span {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8fa3bf;
  font-size: 12px;
}
.asset-picker button, .small {
  border: 1px solid #303848;
  background: #202632;
  color: #ecf0f7;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.small.danger {
  border-color: #5b2631;
  background: #3b1e27;
}
.row-inline {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  width: 100%;
}
.grow { flex: 1; min-width: 0; }
.state-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}
.state-chip {
  border: 1px solid #2f3a4c;
  background: #1f2735;
  color: #d7e1ee;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.state-chip.active {
  border-color: #56b6c2;
  background: #1c3741;
}
.state-transitions {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.transition-list {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.transition-card {
  display: grid;
  gap: 8px;
  border: 1px solid #2a3446;
  border-radius: 8px;
  padding: 8px;
  background: #131b28;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: all ease-in-out 0.1s;
}
.transition-card:hover { background: #192436; }
</style>


