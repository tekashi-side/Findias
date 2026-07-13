import { app, Menu, type MenuItemConstructorOptions } from 'electron';

const isMac = process.platform === 'darwin';

/** Recursively collect every `role` from a menu template (including nested submenus). */
const collectMenuRoles = (items: MenuItemConstructorOptions[]): string[] =>
  items.flatMap((item) => {
    const roles: string[] = item.role ? [item.role] : [];
    if (item.submenu) {
      const submenu = Array.isArray(item.submenu) ? item.submenu : item.submenu.items;
      roles.push(...collectMenuRoles(submenu as MenuItemConstructorOptions[]));
    }
    return roles;
  });

/**
 * Application menu template. Omits zoom roles; `isPackaged` gates dev-only View
 * items (force reload, DevTools).
 */
export const getAppMenuTemplate = (isPackaged: boolean): MenuItemConstructorOptions[] => {
  const viewSubmenu: MenuItemConstructorOptions[] = [{ role: 'reload' }];
  if (!isPackaged) {
    viewSubmenu.push({ role: 'forceReload' }, { role: 'toggleDevTools' });
  }

  return [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: viewSubmenu,
    },
  ];
};

/** Build the application menu from the current packaged/dev state. */
export const buildAppMenu = (): Menu => Menu.buildFromTemplate(getAppMenuTemplate(app.isPackaged));

/** Flat list of menu item roles for the given packaged/dev state (used in tests). */
export const getAppMenuRoles = (isPackaged: boolean): string[] =>
  collectMenuRoles(getAppMenuTemplate(isPackaged));
