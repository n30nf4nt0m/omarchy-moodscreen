import QtQuick
import qs.Commons
import qs.Ui
import "Presets.js" as Presets

Panel {
  id: root
  moduleName: "io.github.phillipelwood1.moodscreen"
  ipcTarget: "io.github.phillipelwood1.moodscreen"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property var svc: null
  readonly property var barIdentity: hostWidget || root
  readonly property color foreground: bar ? bar.foreground : Color.foreground
  readonly property color accent: Color.accent
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  readonly property var families: Presets.FAMILIES
  readonly property string familyId: svc ? svc.familyId : "glass"
  readonly property var family: Presets.familyById(familyId)
  readonly property var userPresets: svc ? (svc.userPresets || []) : []
  readonly property var presets: family.presets.concat(userPresets)
  readonly property string activeId: svc ? svc.presetId : ""
  readonly property bool activeIsUser: Presets.isUserId(activeId)
  readonly property bool screenOn: svc ? svc.enabled === true : false

  property int selected: 0
  property bool keyboardNav: false

  function open() {
    root.keyboardNav = false
    root.selected = Math.max(0, indexOf(root.activeId))
    root.controller.show()
  }
  function close() { root.controller.hide() }
  function toggle() { if (root.opened) close(); else open() }
  function switchPanel(direction) {
    if (bar && typeof bar.switchPanelFrom === "function") return bar.switchPanelFrom(barIdentity, direction)
    return false
  }

  function indexOf(id) {
    for (var i = 0; i < presets.length; i++) if (presets[i].id === id) return i
    return 0
  }

  function choose(index) {
    if (!svc || index < 0 || index >= presets.length) return
    root.selected = index
    svc.setPreset(presets[index].id)
    if (!svc.enabled) svc.powerOn()
  }

  function chooseFamily(id) {
    if (!svc || id === familyId) return
    svc.setFamily(id)
    root.selected = 0
  }

  function paramOf(key) {
    if (!svc || !key) return 0
    var v = Presets.resolve(svc.familyId, svc.presetId, svc.overrides, svc.userPresets)[key]
    return v === undefined ? 0 : v
  }
  function override(key, value) { if (svc) svc.setOverride(key, value) }
  function sameValue(a, b) { return JSON.stringify(a) === JSON.stringify(b) }

  function dim(a) { return Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, a) }

  // ---- reusable rows -------------------------------------------------------
  component Disclosure: Item {
    id: disc
    property var ui
    property string label: ""
    property bool open: true
    signal toggled()

    height: Math.max(discLabel.implicitHeight, Style.space(18))

    Text {
      id: chevron
      anchors.verticalCenter: parent.verticalCenter
      text: disc.open ? "▾" : "▸"
      color: disc.ui ? disc.ui.dim(discHover.containsMouse ? 0.9 : 0.55) : "#888"
      font.family: disc.ui ? disc.ui.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }

    PanelSectionHeader {
      id: discLabel
      anchors.left: chevron.right
      anchors.leftMargin: Style.space(5)
      anchors.verticalCenter: parent.verticalCenter
      text: disc.label
      foreground: disc.ui ? disc.ui.foreground : Color.foreground
      fontFamily: disc.ui ? disc.ui.fontFamily : Style.font.family
    }

    MouseArea {
      id: discHover
      anchors.fill: parent
      hoverEnabled: true
      onClicked: disc.toggled()
    }
  }

  component FamilyTab: Rectangle {
    id: tab
    property var ui
    property string label: ""
    property bool active: false
    signal clicked()

    width: tabLabel.implicitWidth + Style.space(16)
    height: Style.space(22)
    radius: Style.cornerRadius
    color: tab.active && tab.ui
      ? Style.selectedFillFor(tab.ui.foreground, tab.ui.accent)
      : (tabHover.containsMouse && tab.ui ? tab.ui.dim(0.08) : "transparent")
    border.width: tab.active ? 1 : 0
    border.color: tab.ui ? tab.ui.accent : "transparent"

    Text {
      id: tabLabel
      anchors.centerIn: parent
      text: tab.label
      color: tab.ui ? tab.ui.foreground : Color.foreground
      font.family: tab.ui ? tab.ui.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }

    MouseArea {
      id: tabHover
      anchors.fill: parent
      hoverEnabled: true
      onClicked: tab.clicked()
    }
  }

  component LookRow: Rectangle {
    id: look
    property var ui
    required property var modelData
    required property int index
    property int indexOffset: 0
    readonly property int idx: index + indexOffset

    height: lookName.implicitHeight + lookSub.implicitHeight + Style.space(10)
    radius: Style.cornerRadius
    color: look.ui && look.modelData.id === look.ui.activeId
      ? Style.selectedFillFor(look.ui.foreground, look.ui.accent)
      : (lookHover.containsMouse && look.ui ? look.ui.dim(0.06) : "transparent")
    border.width: (look.ui && look.ui.keyboardNav && look.idx === look.ui.selected) ? 1 : 0
    border.color: look.ui ? look.ui.accent : "transparent"

    Column {
      anchors.verticalCenter: parent.verticalCenter
      anchors.left: parent.left
      anchors.leftMargin: Style.space(8)
      spacing: Style.space(1)

      Text {
        id: lookName
        text: look.modelData.name
        color: look.ui ? look.ui.foreground : Color.foreground
        font.family: look.ui ? look.ui.fontFamily : Style.font.family
        font.pixelSize: Style.font.body
      }
      Text {
        id: lookSub
        text: look.modelData.subtitle
        color: look.ui ? look.ui.dim(0.55) : "#888"
        font.family: look.ui ? look.ui.fontFamily : Style.font.family
        font.pixelSize: Style.font.caption
      }
    }

    MouseArea {
      id: lookHover
      anchors.fill: parent
      hoverEnabled: true
      onClicked: {
        if (!look.ui) return
        look.ui.keyboardNav = false
        look.ui.choose(look.idx)
      }
    }
  }

  component ActionButton: Rectangle {
    id: btn
    property var ui
    property string label: ""
    property color labelColor: ui ? ui.foreground : Color.foreground
    signal clicked()

    height: btnLabel.implicitHeight + Style.space(10)
    radius: Style.cornerRadius
    color: btn.ui ? btn.ui.dim(btnHover.containsMouse ? 0.10 : 0.05) : "#222"

    Text {
      id: btnLabel
      anchors.centerIn: parent
      text: btn.label
      color: btn.labelColor
      font.family: btn.ui ? btn.ui.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }
    MouseArea {
      id: btnHover
      anchors.fill: parent
      hoverEnabled: true
      onClicked: btn.clicked()
    }
  }

  component SliderControl: Item {
    id: srow
    property var ui
    property var control: ({ key: "", label: "", min: 0, max: 1, step: 0.01, dec: 2 })

    height: srowLabel.implicitHeight + srowSlider.height + Style.space(2)

    Text {
      id: srowLabel
      text: srow.control.label
      color: srow.ui ? srow.ui.dim(0.75) : "#aaa"
      font.family: srow.ui ? srow.ui.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }

    Text {
      anchors.right: parent.right
      text: srow.ui ? Number(srowSlider.dragging ? srowSlider.liveValue : srow.ui.paramOf(srow.control.key)).toFixed(srow.control.dec === undefined ? 2 : srow.control.dec) : ""
      color: srow.ui ? srow.ui.dim(0.45) : "#888"
      font.family: srow.ui ? srow.ui.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }

    PanelSlider {
      id: srowSlider
      anchors.bottom: parent.bottom
      width: parent.width
      bar: srow.ui ? srow.ui.bar : null
      minimum: srow.control.min
      maximum: srow.control.max
      step: srow.control.step
      value: srow.ui ? srow.ui.paramOf(srow.control.key) : 0
      onMoved: function(v) { if (srow.ui) srow.ui.override(srow.control.key, v) }
    }
  }

  component ToggleControl: Item {
    id: trow
    property var ui
    property var control: ({ key: "", label: "" })

    height: Math.max(trowLabel.implicitHeight, trowSwitch.height)

    Text {
      id: trowLabel
      anchors.left: parent.left
      anchors.verticalCenter: parent.verticalCenter
      text: trow.control.label
      color: trow.ui ? trow.ui.foreground : Color.foreground
      font.family: trow.ui ? trow.ui.fontFamily : Style.font.family
      font.pixelSize: Style.font.body
    }

    ToggleSwitch {
      id: trowSwitch
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      checked: trow.ui ? trow.ui.paramOf(trow.control.key) === true : false
      foreground: trow.ui ? trow.ui.foreground : Color.foreground
      accent: trow.ui ? trow.ui.accent : Color.accent
      onToggled: if (trow.ui) trow.ui.override(trow.control.key, !checked)
    }
  }

  component SwatchOption: Rectangle {
    id: sw
    property var ui
    required property var control
    required property var option

    readonly property bool isPalette: Array.isArray(option.value) && Array.isArray(option.value[0])
    readonly property bool active: sw.ui ? sw.ui.sameValue(sw.ui.paramOf(sw.control.key), sw.option.value) : false

    width: Style.space(36)
    height: Style.space(20)
    radius: Style.cornerRadius
    color: sw.isPalette ? "transparent" : Qt.rgba(sw.option.value[0], sw.option.value[1], sw.option.value[2], 1)
    border.width: sw.active ? 2 : 1
    border.color: sw.ui ? sw.ui.dim(sw.active ? 0.95 : (swHover.containsMouse ? 0.75 : 0.35)) : "#888"

    Row {
      visible: sw.isPalette
      anchors.fill: parent
      anchors.margins: 1
      spacing: 0
      Repeater {
        model: sw.isPalette ? sw.option.value : []
        Rectangle {
          required property var modelData
          width: sw.width / 4 - 0.5
          height: sw.height - 2
          color: Qt.rgba(modelData[0], modelData[1], modelData[2], 1)
        }
      }
    }

    MouseArea {
      id: swHover
      anchors.fill: parent
      hoverEnabled: true
      onClicked: if (sw.ui) sw.ui.override(sw.control.key, sw.option.value)
    }
  }

  component SwatchControl: Column {
    id: crow
    property var ui
    property var control: ({ key: "", label: "", options: [] })
    spacing: Style.space(4)

    Text {
      text: crow.control.label
      color: crow.ui ? crow.ui.dim(0.75) : "#aaa"
      font.family: crow.ui ? crow.ui.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }
    Row {
      spacing: Style.space(6)
      Repeater {
        model: crow.control.options
        SwatchOption { required property var modelData; ui: crow.ui; control: crow.control; option: modelData }
      }
    }
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(340))
    contentHeight: panel.fittedContentHeight(content.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onMoveRequested: function(dx, dy) {
        if (dy === 0) return
        root.keyboardNav = true
        root.selected = Math.max(0, Math.min(root.presets.length - 1, root.selected + dy))
      }
      onActivateRequested: {
        root.keyboardNav = true
        root.choose(root.selected)
      }
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(text) {
        if ((text === " " || text === "p" || text === "P") && root.svc) root.svc.toggle()
      }

      Flickable {
        id: scroller
        anchors.fill: parent
        contentWidth: width
        contentHeight: content.implicitHeight
        flickableDirection: Flickable.VerticalFlick
        boundsBehavior: Flickable.StopAtBounds
        clip: true

        Column {
          id: content
          width: scroller.width
          spacing: Style.space(8)

          // ---- power -------------------------------------------------------
          Item {
            width: parent.width
            height: Math.max(title.implicitHeight, power.height)

            Text {
              id: title
              anchors.verticalCenter: parent.verticalCenter
              text: "MOODSCREEN"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.letterSpacing: 1.2
            }

            ToggleSwitch {
              id: power
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              checked: root.screenOn
              foreground: root.foreground
              accent: root.accent
              onToggled: if (root.svc) root.svc.toggle()
            }
          }

          PanelSeparator { width: parent.width }

          // ---- family picker -------------------------------------------------
          Text {
            text: "FAMILY"
            color: root.dim(0.55)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.letterSpacing: 1.0
          }

          Flow {
            width: parent.width
            spacing: Style.space(6)
            Repeater {
              model: root.families
              FamilyTab {
                required property var modelData
                ui: root
                label: modelData.name
                active: modelData.id === root.familyId
                onClicked: root.chooseFamily(modelData.id)
              }
            }
          }

          Text {
            width: parent.width
            text: root.family.subtitle
            color: root.dim(0.5)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            wrapMode: Text.WordWrap
          }

          PanelSeparator { width: parent.width }

          // ---- looks (presets) ------------------------------------------------
          Text {
            text: "LOOKS"
            color: root.dim(0.55)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.letterSpacing: 1.0
          }

          Column {
            width: parent.width
            spacing: Style.space(2)
            Repeater {
              model: root.family.presets
              LookRow { width: content.width; ui: root }
            }
          }

          Column {
            width: parent.width
            visible: root.userPresets.length > 0
            spacing: Style.space(2)
            Repeater {
              model: root.userPresets
              LookRow { width: content.width; ui: root; indexOffset: root.family.presets.length }
            }
          }

          Row {
            width: parent.width
            spacing: Style.space(8)

            ActionButton {
              width: (parent.width - Style.space(8)) / 2
              ui: root
              label: "Save a copy"
              onClicked: if (root.svc) root.svc.savePreset()
            }
            ActionButton {
              width: (parent.width - Style.space(8)) / 2
              ui: root
              label: root.activeIsUser ? "Delete this copy" : "Reset to stock"
              labelColor: root.activeIsUser ? Color.urgent : root.foreground
              onClicked: {
                if (!root.svc) return
                if (root.activeIsUser) root.svc.deleteUserPreset(root.svc.presetId)
                else root.svc.clearOverrides()
              }
            }
          }

          PanelSeparator { width: parent.width }

          // ---- tune ------------------------------------------------------
          Text {
            text: "TUNE"
            color: root.dim(0.55)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.letterSpacing: 1.0
          }

          Column {
            width: parent.width
            spacing: Style.space(8)

            Repeater {
              model: root.family.controls
              Loader {
                required property var modelData
                width: content.width
                sourceComponent: modelData.type === "toggle" ? toggleComp
                  : (modelData.type === "swatch" ? swatchComp : sliderComp)
                onLoaded: item.control = modelData
                property var __ui: root

                Component { id: sliderComp; SliderControl { ui: root } }
                Component { id: toggleComp; ToggleControl { ui: root } }
                Component { id: swatchComp; SwatchControl { ui: root } }
              }
            }
          }

          Text {
            width: parent.width
            text: "Save a copy to keep your tweaks under this family; Reset to stock drops them."
            color: root.dim(0.45)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            wrapMode: Text.WordWrap
          }
        }
      }
    }
  }
}
