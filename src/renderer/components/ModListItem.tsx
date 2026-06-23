import type { FC } from 'react'
import Button, { type ButtonProps } from '@mui/material/Button'
import ListItem from '@mui/material/ListItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ModAction, ModRow } from '@shared/modList'
import StatusChip from './StatusChip'

type ModListItemProps = {
  row: ModRow
}

const ACTION_LABEL: Record<ModAction, string> = {
  install: 'Install',
  update: 'Update',
  enable: 'Enable',
  disable: 'Disable',
  delete: 'Delete'
}

const actionStyle = (action: ModAction): Pick<ButtonProps, 'variant' | 'color'> => {
  if (action === 'delete') return { variant: 'outlined', color: 'error' }
  if (action === 'install' || action === 'update' || action === 'enable') {
    return { variant: 'contained', color: 'primary' }
  }
  return { variant: 'outlined', color: 'inherit' }
}

const versionSummary = (row: ModRow): string => {
  const release = row.releaseVersion === null ? 'not in release' : `release v${row.releaseVersion}`
  const installed = row.installedVersion === null ? 'not installed' : `installed v${row.installedVersion}`
  return `${release} • ${installed}`
}

const ModListItem: FC<ModListItemProps> = ({ row }) => {
  return (
    <ListItem divider sx={{ flexWrap: 'wrap', gap: 1, py: 1.5 }}>
      <Stack sx={{ flexGrow: 1, minWidth: 0 }} spacing={0.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ wordBreak: 'break-word' }}>
            {row.name}
          </Typography>
          <StatusChip status={row.status} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {versionSummary(row)}
        </Typography>
      </Stack>

      {/* Actions render here but stay disabled until mutations land in Phase 4. */}
      <Stack direction="row" spacing={1}>
        {row.actions.map((action) => (
          <Button key={action} size="small" disabled {...actionStyle(action)}>
            {ACTION_LABEL[action]}
          </Button>
        ))}
      </Stack>
    </ListItem>
  )
}

export default ModListItem
