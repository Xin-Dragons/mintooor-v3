import styles from "../styles/Home.module.css";
import { useMetaplex } from "./useMetaplex";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { CandyMachine, getMerkleProof, getMerkleRoot, Metaplex } from "@metaplex-foundation/js";
import allowList from '../allow-list.json';
import toast, { Toaster } from 'react-hot-toast'
import {
  Box,
  LinearProgress,
  Button,
  Container,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  Stack,
  Modal
} from '@mui/material'
import React from "react";

function ActiveGroup({ activeGroup }) {
  const [hasStartDate, setHasStartDate] = useState(false)
  const [hasEndDate, setHasEndDate] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const hasStartDate = activeGroup?.guards?.startDate
    const hasEndDate = activeGroup?.guards?.endDate;
    const started = (activeGroup?.guards?.startDate?.date?.toString(10) || 0) * 1000 < Date.now();
    setHasStartDate(hasStartDate)
    setHasEndDate(hasEndDate)
    setStarted(started);
    
  }, [activeGroup])

  return (
    <Stack spacing={2}>
      <Typography variant="h3">{activeGroup.label}</Typography>
      {
        !!(activeGroup?.guards?.mintLimit) && (
          <Typography variant="body1">Max per wallet: {activeGroup.guards.mintLimit.limit}</Typography>
        )
      }
      {
        !!(activeGroup?.guards?.allowList) && (
          <Typography variant="body1">Wallet based WL</Typography>
        )
      }
      {
        activeGroup.status && <Typography variant="body1" color="warning">{activeGroup.status}</Typography>
      }
      {
        hasStartDate && !started && <Typography variant="body1">Starts in <Countdown date={activeGroup.guards.startDate.date.toString(10) * 1000} /></Typography>
      }

      {
        hasEndDate && started && <Typography variant="body1">Ends in <Countdown date={activeGroup.guards.endDate.date.toString(10) * 1000} /></Typography>
      }
      
    </Stack>

  )
}

function Countdown({ date }) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const distance = Math.abs(date - now);

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setDays(days)
      setHours(hours)
      setMinutes(minutes)
      setSeconds(seconds)

      if (distance < 0) {
        setExpired(true)
      }
    }, 1000)
    return () => {
      clearInterval(id)
    }
  }, [date])

  return (
    <span>
      {
        expired
          ? 'Completed'
          : (
            <>
              {
                days > 0 && `${days} days, `
              }
              {
                hours > 0 && `${hours} hours, `
              }
              {
                minutes > 0 && `${minutes} minutes, `
              }
              {
                seconds > 0 && `${seconds} seconds`
              }
            </>
          )
      }
    </span>
  )
}


function MintProgress ({ candyMachine }) {
  const actual = candyMachine.itemsMinted.toString(10)
  const total = candyMachine.itemsAvailable.toString(10)
  return (
    <Box>
      <Box sx={{ width: '100%' }} mt={2}>
        <LinearProgress variant="determinate" value={actual / total * 100} sx={{ height: 10, borderRadius: 2 }} />
      </Box>
      <p>Remaining: {total - actual}</p>
    </Box>
  )
}

function Next({ next }) {
  const { metaplex } = useMetaplex()
  const [solanaTime, setSolanaTime] = useState(0);

  async function getSolanaTime() {
    setSolanaTime(Date.now() / 1000);
  }

  return (
    <div>
      <p>Next: {next.label}</p>
      <p>Starts in <Countdown date={next?.guards?.startDate?.date.toString(10) * 1000}/></p>
    </div>
  )
}

export const MintNFTs = () => {
  const { metaplex }: { metaplex: Metaplex } = useMetaplex();
  const wallet = useWallet();
  const [groups, setGroups] = useState<Array<any>>([]);
  const [groupsWithEligibility, setGroupsWithEligibility] = useState<Array<any>>([])
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [status, setStatus] = useState<string>('');
  const [next, setNext] = useState(null)
  const [nft, setNft] = useState(null);
  const [disableMint, setDisableMint] = useState(true);
  const [minting, setMinting] = useState(false);
  const [modalShowing, setModalShowing] = useState(false)

  useEffect(() => {
    if (nft) {
      setModalShowing(true)
    }
  }, [nft])

  useEffect(() => {
    const id = setInterval(() => {
      refreshCandyMachine()
    }, 5000)
    return () => {
      clearInterval(id);
    }
  }, [])

  useEffect(() => {
    if (activeGroup) {
      return;
    }
    if (!groupsWithEligibility.length) {
      return setActiveGroup(null)
    }
    console.log(groupsWithEligibility)
    if (groupsWithEligibility.length === 1) {
      return setActiveGroup(groupsWithEligibility[0]);
    }
    const firstEligible = groupsWithEligibility.find(item => item.canMint);
    if (firstEligible) {
      setActiveGroup(firstEligible)
    } else {
      const publicGroup = groupsWithEligibility.find(group => group.label === 'Public');
      if (publicGroup) {
        setActiveGroup(publicGroup)
      } else {
        setActiveGroup(groupsWithEligibility[0])
      }
    }

  }, [groupsWithEligibility])

  async function getNext() {
    if (!metaplex || !candyMachine) return;
    const slot = await metaplex.connection.getSlot();
    const solanaTime = await metaplex.connection.getBlockTime(slot) || 0

    const next = candyMachine.candyGuard.groups
      .filter(item => item.guards.startDate)
      .sort((a: any, b: any) => {
        return a.guards.startDate.date.toString(10) - b.guards.startDate.date.toString(10)
      })
      .find((item: any) => {
        return item.guards.startDate.date.toString(10) > solanaTime;
      })

    setNext(next);
  }

  useEffect(() => {
    getNext()
  }, [candyMachine])
  
  const candyMachineAddress = new PublicKey(
    process.env.NEXT_PUBLIC_CANDY_MACHINE_ID as string
  );
  let walletBalance;
  let listenersAdded = false;
  const addListener = async () => {
    listenersAdded = true;
    // add a listener to monitor changes to the candy guard
    metaplex.connection.onAccountChange(candyMachine.candyGuard.address,
      () => refreshCandyMachine()
    );

    // add a listener to monitor changes to the user's wallet
    metaplex.connection.onAccountChange(metaplex.identity().publicKey,
      () => refreshCandyMachine()
    );
  };

  async function refreshCandyMachine() {
    // read candy machine state from chain
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });

    setCandyMachine(candyMachine);
  }

  useEffect(() => {
    if (candyMachine) {
      checkEligibility();
    }
  }, [candyMachine])

  const checkEligibility = async () => {
    // enough items available?
    if (
      (candyMachine.itemsAvailable.toString(10) as unknown as bigint) -
      (candyMachine.itemsMinted.toString(10) as unknown as bigint) <=
      0
    ) {
      setStatus("Sold out!");
      setDisableMint(true);
      return;
    }
  };

  async function getgroupsWithEligibility() {
    const slot = await metaplex.connection.getSlot();
    const solanaTime = await metaplex.connection.getBlockTime(slot) || 0

    const groupsWithEligibility = await Promise.all(groups.map(async item => {
      if (item.guards.startDate != null) {
        const candyStartDate = item.guards.startDate.date.toString(10);
        if (solanaTime < candyStartDate) {
          return {
            ...item,
            status: 'Not started',
            canMint: false
          };
        }
      }

      if (item.guards.endDate != null) {
        const candyEndDate = item.guards.endDate.date.toString(10);
        if (solanaTime > candyEndDate) {
          return {
            ...item,
            status: 'Ended',
            canMint: false
          }
        }
      }

      if (item.guards.allowList != null) {
        const proof = getMerkleProof(allowList[item.label], metaplex.identity().publicKey.toBase58());
        if (!proof.length) {
          return {
            ...item,
            status: 'Wallet not whitelisted',
            canMint: false
          }
        }
      }

      if (item.guards.addressGate != null) {
        if (metaplex.identity().publicKey.toBase58() != item.guards.addressGate.address.toBase58()) {
          return {
            ...item,
            status: 'Wallet not allowed to mint',
            canMint: false
          }
        }
      }

      if (item.guards.mintLimit != null) {
        const mintLimitCounter = metaplex.candyMachines().pdas().mintLimitCounter({
          id: item.guards.mintLimit.id,
          user: metaplex.identity().publicKey,
          candyMachine: candyMachine.address,
          candyGuard: candyMachine.candyGuard.address,
        });

        //Read Data from chain
        const mintedAmountBuffer = await metaplex.connection.getAccountInfo(mintLimitCounter, "processed");
        let mintedAmount;
        if (mintedAmountBuffer != null) {
          mintedAmount = mintedAmountBuffer.data.readUintLE(0, 1);
        }
        if (mintedAmount != null && mintedAmount >= item.guards.mintLimit.limit) {
          return {
            ...item,
            status: (`Maximum mints reached`),
            canMint: false
          }
        }
      }

      if (item.guards.solPayment != null) {
        walletBalance = await metaplex.connection.getBalance(
          metaplex.identity().publicKey
        );

        const costInLamports = item.guards.solPayment.amount.basisPoints.toString(10);

        if (costInLamports > walletBalance) {
          return {
            ...item,
            status: 'Requirements not met',
            canMint: false
          }
        }
      }

      if (item.guards.freezeSolPayment != null) {
        walletBalance = await metaplex.connection.getBalance(
          metaplex.identity().publicKey
        );

        const costInLamports = item.guards.freezeSolPayment.amount.basisPoints.toString(10);

        if (costInLamports > walletBalance) {
          return {
            ...item,
            status: 'Insufficient balance',
            canMint: false
          }
        }
      }

      if (item.guards.nftGate != null) {
        const ownedNfts = await metaplex.nfts().findAllByOwner({ owner: metaplex.identity().publicKey });
        const nftsInCollection = ownedNfts.filter(obj => {
          return (obj.collection?.address.toBase58() === item.guards.nftGate.requiredCollection.toBase58()) && (obj.collection?.verified === true);
        });
        if (nftsInCollection.length < 1) {
          return {
            ...item,
            status: 'Requirements not met',
            canMint: false
          }
        }
      }

      if (item.guards.nftBurn != null) {
        const ownedNfts = await metaplex.nfts().findAllByOwner({ owner: metaplex.identity().publicKey });
        const nftsInCollection = ownedNfts.filter(obj => {
          return (obj.collection?.address.toBase58() === item.guards.nftBurn.requiredCollection.toBase58()) && (obj.collection?.verified === true);
        });
        if (nftsInCollection.length < 1) {
          return {
            ...item,
            status: 'Requirements not met',
            canMint: false
          }
        }
      }

      if (item.guards.nftPayment != null) {
        const ownedNfts = await metaplex.nfts().findAllByOwner({ owner: metaplex.identity().publicKey });
        const nftsInCollection = ownedNfts.filter(obj => {
          return (obj.collection?.address.toBase58() === item.guards.nftPayment.requiredCollection.toBase58()) && (obj.collection?.verified === true);
        });
        if (nftsInCollection.length < 1) {
          return {
            ...item,
            status: 'Requirements not met',
            canMint: false
          }
        }
      }

      if (item.guards.redeemedAmount != null) {
        if (item.guards.redeemedAmount.maximum.toString(10) <= candyMachine.itemsMinted.toString(10)) {
          return {
            ...item,
            status: 'Maximum items redeemed',
            canMint: false
          }
        }
      }

      if (item.guards.tokenBurn != null) {
        const ata = await metaplex.tokens().pdas().associatedTokenAccount({ mint: item.guards.tokenBurn.mint, owner: metaplex.identity().publicKey });
        const balance = await metaplex.connection.getTokenAccountBalance(ata);
        if (balance < item.guards.tokenBurn.amount.basisPoints.toNumber()) {
          return {
            ...item,
            status: 'Requirements not met',
            canMint: false
          }
        }
      }

      if (item.guards.tokenGate != null) {
        const ata = await metaplex.tokens().pdas().associatedTokenAccount({ mint: item.guards.tokenGate.mint, owner: metaplex.identity().publicKey });
        const balance = await metaplex.connection.getTokenAccountBalance(ata);
        if (balance < item.guards.tokenGate.amount.basisPoints.toNumber()) {
          return {
            ...item,
            status: 'Requirements not met',
            canMint: false
          }
        }
      }

      if (item.guards.tokenPayment != null) {
        try {
          const ata = await metaplex.tokens().pdas().associatedTokenAccount({ mint: item.guards.tokenPayment.mint, owner: metaplex.identity().publicKey });
          const balance = await metaplex.connection.getTokenAccountBalance(ata);
          if (Number(balance.value.amount) < item.guards.tokenPayment.amount.basisPoints.toNumber()) {
            return {
              ...item,
              status: 'Insufficient balance',
              canMint: false
            }
          }
        } catch {
          return {
            ...item,
            status: 'Insufficient balance',
            canMint: false
          }
        }
        
        if (item.guards.freezeTokenPayment != null) {
          try {
            const ata = await metaplex.tokens().pdas().associatedTokenAccount({ mint: item.freezeTokenPayment.mint, owner: metaplex.identity().publicKey });
            const balance = await metaplex.connection.getTokenAccountBalance(ata);
            if (Number(balance.value.amount) < item.guards.freezeTokenPayment.amount.basisPoints.toNumber()) {
              return {
                ...item,
                status: 'Insufficient balance',
                canMint: false
              }
            }
          } catch {
            return {
              ...item,
              status: 'Insufficient balance',
              canMint: false
            }
          }
          
        }
      }

      return {
        ...item,
        canMint: true
      }
    }))

    setGroupsWithEligibility(groupsWithEligibility)
  }

  useEffect(() => {
    setGroups(candyMachine?.candyGuard?.groups || [])
  }, [candyMachine])

  useEffect(() => {
    getgroupsWithEligibility()
  }, [groups])

  useEffect(() => {
    if (activeGroup) {
      setDisableMint(false);
    }
  }, [activeGroup])

  useEffect(() => {
    if (!wallet.connected) return
    setup()
  }, [wallet.connected])

  useEffect(() => {
    if (listenersAdded || !candyMachine) return;
    addListener();
  }, [candyMachine])

  async function setup() {
    await refreshCandyMachine();
  }

  // show and do nothing if no wallet is connected
  if (!wallet.connected) {
    return null;
  }

  const onClick = async () => {
    console.log(activeGroup)
    if (!activeGroup || !activeGroup.canMint) {
      return;
    }
    try {
      setMinting(true)
      if (activeGroup.guards.allowList) {
        const mintingWallet = metaplex.identity().publicKey.toBase58();
        const checkPromise = metaplex.candyMachines().callGuardRoute({
          candyMachine,
          guard: 'allowList',
          group: activeGroup.label,
          settings: {
            path: 'proof',
            merkleProof: getMerkleProof(allowList[activeGroup.label], mintingWallet),
          },
        });

        toast.promise(checkPromise, {
          loading: 'Checking allow list',
          success: <b>Allowed to mint.</b>,
          error: e => {
            console.log(e.message)
            if (e.message.includes('Requested resource not available.')) {
              return <b>Failed: Cannot send multiple simultaneous transactions</b>
            }
            if (e.message.includes('User rejected the request.')) {
              return <b>Failed: User rejected the request</b>
            }

            return <b>Failed: {err.message}</b>
          }
        })
  
        await checkPromise
      }
      

      // Here the actual mint happens. Depending on the guards that you are using you have to run some pre validation beforehand 
      // Read more: https://docs.metaplex.com/programs/candy-machine/minting#minting-with-pre-validation
      const mintPromise = metaplex?.candyMachines().mint({
        candyMachine,
        collectionUpdateAuthority: candyMachine.authorityAddress,
        group: activeGroup.label
      });

      toast.promise(mintPromise, {
        loading: 'Minting...',
        success: <b>Success!</b>,
        error: err => <b>Something went wrong: {err.message}</b>
      })

      const { nft }: { nft: any } = await mintPromise

      setNft(nft);
    } catch (err) {
      toast.error('Mint unsuccessful')
    } finally {
      setMinting(false)
    }
    
  };

  return (
    <Container>
      <Toaster />
      <Stack spacing={2}>
        <Typography variant="h1"><img src="/ss.svg"/></Typography>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={5}>
              {
                !!(groupsWithEligibility.length) && (
                  <Tabs value={activeGroup?.label} orientation="vertical">
                    {
                      groupsWithEligibility.map((item, index) => {
                        return <Tab key={index} value={item.label} onClick={() => setActiveGroup(item)} label={item.label} />
                      })
                    }
                  </Tabs>
                )
              }
              <Stack sx={{flexGrow: 1}} spacing={2}>
                {
                  activeGroup && <ActiveGroup activeGroup={activeGroup} />
                }
                <Button onClick={onClick} disabled={disableMint || minting || !activeGroup || !activeGroup.canMint} variant="contained">
                  mint NFT
                  {minting && <CircularProgress />}
                </Button>
                {
                  status && <Typography variant="h3">{status}</Typography>
                }
                {
                  candyMachine && <MintProgress candyMachine={candyMachine} />
                }
                {
                  next && <Next next={next} />
                }
              </Stack>
            </Stack>
            <Modal open={modalShowing} onClose={() => setModalShowing(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className={styles.nftPreview}>
                <h1>{nft?.name}</h1>
                <img
                  height={500}
                  src={nft?.json?.image || "/fallbackImage.jpg"}
                  alt="The downloaded illustration of the provided NFT address."
                />
              </div>
            </Modal>
          </CardContent>
        </Card>
        <Typography variant="h4"><a href="https://www.xlabs.so/"><img src="/xlaunchpad.png" alt="XLaunchpad logo" className="xlabs"/></a></Typography>
      </Stack>
    </Container>
  );
};
