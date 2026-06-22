import { useQuery } from '@tanstack/react-query'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'

function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['appInfo'],
    queryFn: () => window.findias.getAppInfo()
  })

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Findias</Typography>
        <Typography variant="body2" color="text.secondary">
          Mod manager for Mabinogi — walking skeleton
        </Typography>

        <Paper variant="outlined" sx={{ p: 2 }}>
          {isLoading && <CircularProgress size={20} />}
          {error && <Typography color="error">IPC round-trip failed</Typography>}
          {data && (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="success.main">
                IPC round-trip OK
              </Typography>
              <Typography variant="body2">App version: {data.appVersion}</Typography>
              <Typography variant="body2">Electron: {data.electronVersion}</Typography>
              <Typography variant="body2">Chrome: {data.chromeVersion}</Typography>
              <Typography variant="body2">Node: {data.nodeVersion}</Typography>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  )
}

export default App
