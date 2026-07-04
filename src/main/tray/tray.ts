import { BrowserWindow, Menu, Tray } from 'electron'
import icon from '../../../resources/icon.png?asset'

export function createTray(mainWindow: BrowserWindow, onQuit: () => void): Tray {
  const tray = new Tray(icon)
  tray.setToolTip('Parser Desktop')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Показать окно',
      click: () => {
        mainWindow.show()
      }
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: onQuit
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    mainWindow.show()
  })

  return tray
}
