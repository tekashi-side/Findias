import type { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import type { SetupState } from '@shared/api'
import ModList from './ModList'

type MainViewProps = {
  setup: SetupState
}

const MainView: FC<MainViewProps> = ({ setup }) => {
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['modList'],
    queryFn: () => window.findias.refresh()
  })

  const rows = data?.rows ?? []
  const catalogUnavailable = data ? !data.catalog.available : false

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            Findias
          </Typography>
          <Button variant="outlined" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {setup.gameRootPath}
        </Typography>

        {isLoading && (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress />
          </Stack>
        )}

        {isError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          >
            {error instanceof Error ? error.message : 'Failed to load the mod list.'}
          </Alert>
        )}

        {catalogUnavailable && (
          <Alert severity="warning">
            {data?.catalog.error ?? 'The mod catalog is currently unavailable.'} Showing the mods
            already on disk.
          </Alert>
        )}

        {data && rows.length === 0 && (
          <Alert severity="info">
            {data.catalog.available
              ? 'No compatible mods were found in the latest Uiscias release.'
              : 'No managed mods are installed.'}
          </Alert>
        )}

        {rows.length > 0 && (
          <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 1 }}>
            <ModList rows={rows} />
          </Box>
        )}
      </Stack>
    </Container>
  )
}

export default MainView
