import type { FC } from 'react'
import List from '@mui/material/List'
import type { ModRow } from '@shared/modList'
import ModListItem from './ModListItem'

type ModListProps = {
  rows: ModRow[]
}

const ModList: FC<ModListProps> = ({ rows }) => {
  return (
    <List disablePadding>
      {rows.map((row) => (
        <ModListItem key={row.modId} row={row} />
      ))}
    </List>
  )
}

export default ModList
