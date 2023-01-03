import { Container, Stack, Typography, Card, CardContent, Tabs, Tab } from "@mui/material"
import { useState } from "react"
import { Toaster } from "react-hot-toast"
import { MintNFTs } from "./MintNFTs"

const candyMachines = {
  'Mitsu': 'EZCCf8i6FiamhyDzdMUARzjWurenCGqrZH7JpMP1twpS',
  'Xin': 'BqVcQNZF64E3KLY78hV1aXsjDTaG5ns8cs72Z6Q5pBiJ',
  '$BONK': '9xz1wm1tkFcvt6gNjF5bBrKEzKU98bPRRSVgaKRsh2XW'
}

export function App() {
  const [activeMint, setActiveMint] = useState<string>('Mitsu')
  return (
    <Container>
      <Toaster />
      <Stack spacing={2}>
        <Typography variant="h1"><img width={192} src="/logo.png"/></Typography>
        <Tabs value={activeMint} className="cm-tabs">
          {
            Object.keys(candyMachines).map((cm, index) => {
              return <Tab key={index} value={cm} onClick={() => setActiveMint(cm)} label={cm} />
            })
          }
        </Tabs>
        <Card className="main-window">
          <CardContent>
            <MintNFTs cmId={candyMachines[activeMint] as string} />
          </CardContent>
        </Card>
      </Stack>
      <Typography variant="h4"><a href="https://www.xlabs.so/"><img src="/xlaunchpad.png" alt="XLaunchpad logo" className="xlabs"/></a></Typography>
    </Container>
  )
}