import QtQuick
import Quickshell.Io
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.phillipelwood1.moodscreen"

  // bar.shell.serviceFor() only resolves for first-party/registered widgets;
  // installed third-party plugins get a bar-entry facade whose service
  // lookup is never wired up (always returns null). Load our own instance
  // of the service directly instead — its state (state.json) and effect
  // application (hyprctl) are shared/idempotent across instances, so this
  // stays in sync with the "service" kind entry point the host also loads.
  readonly property var svc: svcLoader.item || null

  Loader {
    id: svcLoader
    active: true
    source: Qt.resolvedUrl("Service.qml")
  }
  readonly property bool screenOn: svc ? svc.enabled === true : false
  readonly property string familyName: svc ? familyLabel(svc.familyId) : ""

  function familyLabel(id) {
    var list = familiesFor()
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name
    return id
  }
  function familiesFor() { return panelLoader.item ? panelLoader.item.families : [] }

  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false

  function open() { if (panelLoader.item) panelLoader.item.open() }
  function close() { if (panelLoader.item) panelLoader.item.close() }
  function toggle() { if (panelLoader.item) panelLoader.item.toggle() }
  function closeForPopoutSwitch() { if (panelLoader.item) panelLoader.item.closeForPopoutSwitch() }

  function injectPanel() {
    if (!panelLoader.item) return
    panelLoader.item.bar = root.bar
    panelLoader.item.anchorItem = button
    panelLoader.item.hostWidget = root
    panelLoader.item.svc = root.svc
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight
  onBarChanged: injectPanel()
  onSvcChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  IpcHandler {
    target: "io.github.phillipelwood1.moodscreen"
    function open(): void { root.open() }
    function close(): void { root.close() }
    function toggle(): void { root.toggle() }
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "🎨"
    tooltipText: root.screenOn
      ? "Moodscreen · " + root.familyName + " · right-click to switch off"
      : "Moodscreen · off · right-click to switch on"
    active: root.screenOn
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton) { if (root.svc) root.svc.toggle() }
      else root.toggle()
    }
  }
}
