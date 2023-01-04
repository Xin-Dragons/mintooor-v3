import { Container, Stack, Typography, Card, CardContent, Tabs, Tab } from "@mui/material"
import { PublicKey } from "@solana/web3.js"
import { useWallet } from "@solana/wallet-adapter-react"
import { map } from "lodash"
import { useEffect, useState } from "react"
import { Toaster } from "react-hot-toast"
import { MintNFTs } from "./MintNFTs"
import { useMetaplex } from "./useMetaplex"

const candyMachines = {
  'Mitsu': '46XowcjpCxYy7PxHHkWGytQxciQrCFb6zbNTQnAi19tD',
  'Xin': '6k5DYH6CmLwnCXCDN6QeMkJHWqe1rbqzPktKykwhVf29',
  '$BONK': 'BhTcB1KQkTG3toW72zSYej6gw4dyLRyFJztfv6E87u2K'
}

export function App() {
  const [activeMint, setActiveMint] = useState<string>('Mitsu');
  const [totalAvailable, setTotalAvailable] = useState<number>(10000);
  const [totalMinted, setTotalMinted] = useState<number>(10000);
  const { metaplex } = useMetaplex()
  const wallet = useWallet();

  async function getTotals() {
    const totals = await Promise.all(map(candyMachines, async cm => {
      const candyMachine = await metaplex.candyMachines().findByAddress({ address: new PublicKey(cm) })
      const actual = candyMachine.itemsMinted.toNumber()
      const total = candyMachine.itemsAvailable.toNumber()
      return {
        actual,
        total
      }
    }))

    setTotalAvailable(totals.reduce((sum, item) => sum + item.total, 0))
    setTotalMinted(totals.reduce((sum, item) => sum + item.actual, 0))
  }

  useEffect(() => {
    const id = setInterval(getTotals, 5000);
    return () => {
      clearInterval(id)
    }
  }, [])

  if (!wallet.connected) {
    return;
  }

  return (
    <Container>
      <Toaster />
      <Stack spacing={2}>
        <Typography variant="h1"><img width={192} className="logo" src="/logo.png"/></Typography>
        <Tabs value={activeMint} className="cm-tabs">
          {
            Object.keys(candyMachines).map((cm, index) => {
              return <Tab key={index} value={cm} onClick={() => setActiveMint(cm)} label={cm} />
            })
          }
        </Tabs>
        
        <MintNFTs cmId={candyMachines[activeMint] as string} totalMinted={totalMinted} totalAvailable={totalAvailable} />
      </Stack>
      <Typography variant="h4"><a href="https://www.xlabs.so/"><img src="/xlaunchpad.png" alt="XLaunchpad logo" className="xlabs"/></a></Typography>
    </Container>
  )
}