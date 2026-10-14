import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Hyprland
import Quickshell.Wayland
import "Presets.js" as Presets
import "ShaderBuilder.js" as ShaderBuilder

// Owns the active mood: which family, which preset, live overrides on top,
// and keeps Hyprland's global screen shader in sync with all three. Only one
// screen_shader can be loaded at a time, so switching family or preset simply
// regenerates the same file with different GLSL rather than juggling several.
Item {
  id: root

  readonly property string home: Quickshell.env("HOME")
  readonly property string stateRoot: (Quickshell.env("XDG_STATE_HOME") || (home + "/.local/state")) + "/moodscreen"
  readonly property string statePath: stateRoot + "/state.json"
  readonly property string shaderPath: stateRoot + "/current.frag"

  // On, right out of the box: a freshly installed plugin (no state.json yet)
  // should already be running when the shell starts, not wait for a manual
  // toggle. Once a state file exists, loadState()'s own `enabled` wins, so
  // this default only ever matters before the first save.
  property bool enabled: true
  property string familyId: "glass"
  property string presetId: "frosted"
  property var overrides: ({})
  // Saved copies live per-family: { familyId: [ {id, name, subtitle, params} ] }
  property var userPresetsByFamily: ({})
  property int paramsRevision: 0
  property bool loaded: false

  property int baseDamage: -1

  readonly property var family: Presets.familyById(root.familyId)
  readonly property var userPresets: root.userPresetsByFamily[root.familyId] || []

  signal changed()
  onChanged: root.paramsRevision = root.paramsRevision + 1

  function currentParams() {
    return Presets.resolve(root.familyId, root.presetId, root.overrides, root.userPresets)
  }
  function currentIsLive() {
    return Presets.isLive(root.family, root.currentParams())
  }

  // ---- Hyprland plumbing ---------------------------------------------------
  function hypr(lua) { Quickshell.execDetached(["hyprctl", "eval", lua]) }

  function applyWith(damage, shader) {
    hypr('hl.config({ debug = { damage_tracking = ' + Math.round(damage) + ' } }); ' +
         'hl.config({ decoration = { screen_shader = "' + shader + '" } })')
  }

  function clearShaderOption(damage) { applyWith(damage, "") }

  readonly property int staticDamage: 1

  property int renderGeneration: 0
  property int appliedGeneration: 0

  function render() {
    if (!root.enabled) return
    var live = root.currentIsLive()
    root.renderGeneration += 1
    var src = ShaderBuilder.build(root.familyId, root.currentParams(), { mode: live ? "live" : "static" })
    shaderFile.setText(src)
    applyFallbackTimer.pendingDamage = live ? 0 : root.staticDamage
    applyFallbackTimer.restart()
  }

  function applyRendered(damage) {
    if (root.appliedGeneration === root.renderGeneration) return
    root.appliedGeneration = root.renderGeneration
    applyFallbackTimer.stop()
    applyWith(damage, root.shaderPath)
  }

  function powerOn() {
    if (root.enabled) return
    root.enabled = true
    root.saveState()
    render()
    root.changed()
  }

  function powerOff() {
    if (!root.enabled) return
    root.enabled = false
    clearShaderOption(root.baseDamage >= 0 ? root.baseDamage : 2)
    root.saveState()
    root.changed()
  }

  function toggle() { root.enabled ? powerOff() : powerOn() }

  function setFamily(id) {
    var fam = Presets.familyById(id)
    if (fam.id === root.familyId) return
    root.familyId = fam.id
    root.presetId = fam.presets[0].id
    root.overrides = ({})
    root.saveState()
    if (root.enabled) render()
    root.changed()
  }

  function setPreset(id) {
    root.presetId = Presets.presetById(root.family, id, root.userPresets).id
    root.overrides = ({})
    root.saveState()
    if (root.enabled) render()
    root.changed()
  }

  function setOverride(key, value) {
    var next = {}
    for (var k in root.overrides) next[k] = root.overrides[k]
    next[key] = value
    root.overrides = next
    root.saveState()
    if (root.enabled) render()
    root.changed()
  }

  function clearOverride(key) {
    if (!(key in root.overrides)) return
    var next = {}
    for (var k in root.overrides) if (k !== key) next[k] = root.overrides[k]
    root.overrides = next
    root.saveState()
    if (root.enabled) render()
    root.changed()
  }

  function clearOverrides() {
    root.overrides = ({})
    root.saveState()
    if (root.enabled) render()
    root.changed()
  }

  function savePreset() {
    var base = Presets.presetById(root.family, root.presetId, root.userPresets)
    var entry = {
      id: "user-" + Date.now(),
      name: Presets.copyName(base.name, root.userPresets),
      subtitle: "your copy of " + base.name,
      params: root.currentParams()
    }
    var list = root.userPresets.slice()
    list.push(entry)
    var next = {}
    for (var k in root.userPresetsByFamily) next[k] = root.userPresetsByFamily[k]
    next[root.familyId] = list
    root.userPresetsByFamily = next
    root.presetId = entry.id
    root.overrides = ({})
    root.saveState()
    root.changed()
    return entry.id
  }

  function deleteUserPreset(id) {
    if (!Presets.isUserId(id)) return
    var list = root.userPresets.filter(function(u) { return u.id !== id })
    var next = {}
    for (var k in root.userPresetsByFamily) next[k] = root.userPresetsByFamily[k]
    next[root.familyId] = list
    root.userPresetsByFamily = next
    if (root.presetId === id) {
      root.presetId = root.family.presets[0].id
      root.overrides = ({})
      if (root.enabled) render()
    }
    root.saveState()
    root.changed()
  }

  function reapply() {
    if (!root.enabled) return
    applyWith(root.currentIsLive() ? 0 : root.staticDamage, root.shaderPath)
  }

  // ---- persistence ---------------------------------------------------------
  function loadState(text) {
    var data = null
    try { data = JSON.parse(String(text || "")) } catch (e) { data = null }
    if (data && typeof data === "object") {
      root.enabled = !!data.enabled
      root.familyId = Presets.familyById(data.family || "glass").id
      root.userPresetsByFamily = (data.userPresetsByFamily && typeof data.userPresetsByFamily === "object") ? data.userPresetsByFamily : ({})
      root.presetId = Presets.presetById(root.family, data.preset || root.family.presets[0].id, root.userPresets).id
      root.overrides = (data.overrides && typeof data.overrides === "object") ? data.overrides : ({})
      if (data.baseline && typeof data.baseline === "object")
        root.baseDamage = (typeof data.baseline.damage === "number") ? data.baseline.damage : -1
    }
    root.loaded = true
    if (root.enabled) render()
    if (root.baseDamage < 0) baselineProc.running = true
    root.changed()
  }

  function saveState() { if (root.loaded) saveTimer.restart() }

  function flushState() {
    stateFile.setText(JSON.stringify({
      version: 1,
      enabled: root.enabled,
      family: root.familyId,
      preset: root.presetId,
      overrides: root.overrides,
      userPresetsByFamily: root.userPresetsByFamily,
      baseline: { damage: root.baseDamage }
    }, null, 2) + "\n")
  }

  Component.onCompleted: ensureStateDir.running = true

  Process {
    id: ensureStateDir
    command: ["mkdir", "-p", root.stateRoot]
    running: false
    onExited: stateFile.reload()
  }

  Process {
    id: baselineProc
    running: false
    command: ["bash", "-c",
      "hyprctl getoption debug:damage_tracking -j | grep -o '\"int\": *[0-9-]*' | grep -o '[0-9-]*$'"]
    stdout: StdioCollector {
      onStreamFinished: {
        var v = parseInt(String(text || "").trim(), 10)
        if (root.baseDamage < 0) root.baseDamage = isNaN(v) ? 2 : v
        root.saveState()
      }
    }
  }

  FileView {
    id: stateFile
    path: root.statePath
    watchChanges: false
    atomicWrites: true
    printErrors: false
    onLoaded: root.loadState(text())
    onLoadFailed: root.loadState("")
  }

  FileView {
    id: shaderFile
    path: root.shaderPath
    watchChanges: false
    atomicWrites: true
    printErrors: false
    onSaved: root.applyRendered(applyFallbackTimer.pendingDamage)
  }

  // Covers the case where FileView had nothing to write (identical content).
  Timer {
    id: applyFallbackTimer
    property int pendingDamage: 1
    interval: 90
    repeat: false
    onTriggered: root.applyRendered(pendingDamage)
  }

  Timer {
    id: saveTimer
    interval: 150
    repeat: false
    onTriggered: root.flushState()
  }

  Timer {
    id: reapplyTimer
    interval: 250
    repeat: false
    onTriggered: root.reapply()
  }

  // A 1x1 transparent, click-through surface that commits a new buffer every
  // frame while the active family is live — the commit is the damage that
  // keeps Hyprland redrawing the monitor so `time` actually reaches the
  // screen. See Phosphor's Service.qml for the same trick and why it's needed.
  readonly property bool needsFrames: root.enabled && root.currentIsLive()

  Variants {
    model: Quickshell.screens
    PanelWindow {
      required property var modelData
      screen: modelData
      visible: root.needsFrames
      color: "transparent"
      anchors { top: true; left: true }
      implicitWidth: 1
      implicitHeight: 1
      exclusiveZone: 0
      WlrLayershell.namespace: "moodscreen-tick"
      WlrLayershell.layer: WlrLayer.Overlay
      WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
      mask: Region {}

      Rectangle {
        anchors.fill: parent
        color: ticker.odd ? "#01ffffff" : "#02ffffff"
      }

      FrameAnimation {
        id: ticker
        running: root.needsFrames
        property bool odd: false
        onTriggered: ticker.odd = !ticker.odd
      }
    }
  }

  Connections {
    target: Hyprland
    function onRawEvent(event) {
      if (String(event && event.name ? event.name : "") === "configreloaded") reapplyTimer.restart()
    }
  }

  IpcHandler {
    target: "moodscreen"
    function enable(): void { root.powerOn() }
    function disable(): void { root.powerOff() }
    function toggle(): void { root.toggle() }
    function family(id: string): void { root.setFamily(id) }
    function preset(id: string): void { root.setPreset(id) }
    function set(key: string, value: string): void {
      var s = String(value)
      var v
      if (s === "true") v = true
      else if (s === "false") v = false
      else { v = parseFloat(s); if (isNaN(v)) return }
      root.setOverride(String(key), v)
    }
    function stock(key: string): void { root.clearOverride(String(key)) }
    function save(): string { return root.savePreset() }
    function reset(): void { root.clearOverrides() }
    function remove(): void { root.deleteUserPreset(root.presetId) }
    function reapply(): void { root.reapply() }
    function status(): string {
      return JSON.stringify({ enabled: root.enabled, family: root.familyId, preset: root.presetId,
                              live: root.currentIsLive(), damage: root.enabled ? (root.currentIsLive() ? 0 : root.staticDamage) : root.baseDamage })
    }
  }
}
