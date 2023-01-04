import styles from "../styles/Home.module.css";
import { useMetaplex } from "./useMetaplex";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { CandyMachine, Metaplex } from "@metaplex-foundation/js";
import toast from 'react-hot-toast'

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
import { sample } from "lodash";

function ActiveGroup({ group, onExpired }) {
  const [hasStartDate, setHasStartDate] = useState(false)
  const [hasEndDate, setHasEndDate] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const hasStartDate = group?.guards?.startDate
    const hasEndDate = group?.guards?.endDate;
    const started = (group?.guards?.startDate?.date?.toString(10) || 0) * 1000 < Date.now();
    setHasStartDate(hasStartDate)
    setHasEndDate(hasEndDate)
    setStarted(started);
    
  }, [group])

  if (!group) {
    return null;
  }

  let tokenPayment = group?.guards?.tokenPayment?.amount?.basisPoints?.toNumber();

  if (tokenPayment && group?.guards?.tokenBurn) {
    const amount = group?.guards?.tokenBurn?.amount?.basisPoints?.toNumber();
    tokenPayment += amount;

    const decimals = group.label === '$XIN' ? 6 : 5

    tokenPayment = tokenPayment / Math.pow(10, decimals)
  }

  const currency = group.label
  

  return (
    <Stack spacing={2}>
      <Typography variant="h3">{group.label === 'LGCY' ? 'Legacy' : group.label}</Typography>
      <div className="mint-info">
        {
          !!(group?.guards?.tokenPayment) && (
            <Typography variant="body1"><span><img src="/type.svg"/></span> Type:&nbsp; <span>SPL Mint</span></Typography>
          )
        }
        {
          !!(group?.label === '$XIN' && group?.guards?.tokenBurn) && (
            <Typography variant="body1"><span></span> WL token burn</Typography>
          )
        }
        {
          !!(group?.guards?.nftBurn) && [
            <Typography variant="body1"><span><img src="/type.svg"/></span> Type:&nbsp; <span>NFT Burn</span></Typography>,
            <Typography variant="body1">MITSU BEAR CHOSEN AT RANDOM</Typography>
          ]
        }
        {
          !!(group?.guards?.allowList) && (
            <Typography variant="body1"><span><img src="/type.svg"/></span> Type:&nbsp; <span>WL</span></Typography>
          )
        }
        {
          !!(group?.guards?.mintLimit) && (
            <Typography variant="body1"><span><img src="/nfts.svg"/></span>Max NFTs:&nbsp; <span>{group.guards.mintLimit.limit}</span></Typography>
          )
        }
        {
          !!(tokenPayment) && (
            <Typography variant="body1">
              <span>{tokenPayment.toLocaleString()} <span>{currency}</span></span>
            </Typography>
          )
        }
      </div>
      <div className="mint-status">
        {
          group.status
            ? <Typography variant="body1" color="warning">{group.status}</Typography>
            : <Typography variant="body1" color="warning">Eligible to mint</Typography>
        }
        {
          hasStartDate && !started && <Typography variant="body1">Starts in <Countdown date={group?.guards?.startDate?.date?.toString(10) * 1000} onExpired={onExpired} /></Typography>
        }

        {
          hasEndDate && started && <Typography variant="body1">Ends in <Countdown date={group?.guards?.endDate?.date?.toString(10) * 1000} onExpired={onExpired} /></Typography>
        }
      </div>
    </Stack>

  )
}

function Countdown({ date, onExpired = () => {} }) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [expired, setExpired] = useState(false);

  function updateTimer() {
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
  }

  useEffect(() => {
    updateTimer();
    const id = setInterval(updateTimer, 1000)
    if (expired) {
      clearInterval(id);
      setDays(0)
      setHours(0)
      setMinutes(0)
      setSeconds(0)
      
    }
    return () => {
      clearInterval(id)
    }
  }, [date, expired])

  useEffect(() => {
    if (expired) {
      onExpired()
    }
  }, [expired])

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


function MintProgress ({ candyMachine, totalMinted, totalAvailable, activeGroup }) {
  const actual = activeGroup === '$BONK' ? totalMinted : candyMachine.itemsMinted.toString(10)
  const total = activeGroup === '$BONK' ? totalAvailable : candyMachine.itemsAvailable.toString(10)
  return (
    <Box>
      <Box sx={{ width: '100%' }} mt={2}>
        <LinearProgress variant="determinate" value={actual / total * 100} sx={{ height: 10, borderRadius: 2 }} />
      </Box>
      <p className="remaining-f"><span><img src="/nfts.svg"/></span>&nbsp; Remaining:&nbsp; <span>{total - actual}</span></p>
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
      <p><b>Next: <span>{next.label}</span></b>  <span className="counter-fw">Starts in <Countdown date={next?.guards?.startDate?.date.toString(10) * 1000}/></span></p>
    </div>
  )
}

export const MintNFTs = ({ cmId: initialCmid, totalMinted, totalAvailable }: { cmId: string, totalMinted: number, totalAvailable: number }) => {
  const { metaplex }: { metaplex: Metaplex } = useMetaplex();
  const wallet = useWallet();
  const [cmId, setCmid] = useState(initialCmid)
  const [groups, setGroups] = useState<Array<any>>([]);
  const [groupsWithEligibility, setGroupsWithEligibility] = useState<Array<any>>([])
  const [activeGroup, setActiveGroup] = useState<string>(null);
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [status, setStatus] = useState<string>('');
  const [next, setNext] = useState(null)
  const [nft, setNft] = useState(null);
  const [disableMint, setDisableMint] = useState(true);
  const [minting, setMinting] = useState(false);
  const [modalShowing, setModalShowing] = useState(false)

  useEffect(() => {
    setCmid(initialCmid)
  }, [initialCmid])

  async function updateCM() {
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: new PublicKey(cmId) });

    setCandyMachine(candyMachine)
  }

  useEffect(() => {
    updateCM()
  }, [cmId])

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
  }, [cmId])

  useEffect(() => {
    if (activeGroup && candyMachine.candyGuard.groups.map(g => g.label).includes(activeGroup)) {
      return;
    }
    if (!groupsWithEligibility.length) {
      return setActiveGroup(null)
    }
    if (groupsWithEligibility.length === 1) {
      return setActiveGroup(groupsWithEligibility[0].label);
    }
    const firstEligible = groupsWithEligibility.find(item => item.canMint);
    if (firstEligible) {
      setActiveGroup(firstEligible.label)
    } else {
      const publicGroup = groupsWithEligibility.find(group => group.label === 'Public');
      if (publicGroup) {
        setActiveGroup(publicGroup.label)
      } else {
        setActiveGroup(groupsWithEligibility[0].label)
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
    const candyMachineAddress = new PublicKey(cmId);
    // read candy machine state from chain
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });

    console.log({ candyMachine })

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
            status: 'Insufficient SOL Balance',
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
            status: 'No Xin Dragons detected',
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
        try {
          const ata = await metaplex.tokens().pdas().associatedTokenAccount({ mint: item.guards.tokenBurn.mint, owner: metaplex.identity().publicKey });
          const balance = await metaplex.connection.getTokenAccountBalance(ata);
          if (balance < item.guards.tokenBurn.amount.basisPoints.toNumber()) {
            return {
              ...item,
              status: 'No WL tokens detected',
              canMint: false
            }
          }
        } catch {
          return {
            ...item,
            status: 'No WL tokens detected',
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
    if (!activeGroup) {
      return;
    }
    const group = groupsWithEligibility.find(g => g.label === activeGroup);
    if (!group || !group.canMint) {
      toast.error('Not eligible to mint in this group')
      return
    }

    try {
      setMinting(true)
      // if (group.guards.allowList) {
      //   const mintingWallet = metaplex.identity().publicKey.toBase58();
      //   const checkPromise = metaplex.candyMachines().callGuardRoute({
      //     candyMachine,
      //     guard: 'allowList',
      //     group: group.label,
      //     settings: {
      //       path: 'proof',
      //       merkleProof: getMerkleProof(allowList[group.label], mintingWallet),
      //     },
      //   });

      //   toast.promise(checkPromise, {
      //     loading: 'Checking allow list',
      //     success: <b>Allowed to mint.</b>,
      //     error: e => {
      //       console.error(e)
      //       if (e.message.includes('Requested resource not available.')) {
      //         return <b>Failed: Cannot send multiple simultaneous transactions</b>
      //       }
      //       if (e.message.includes('User rejected the request.')) {
      //         return <b>Failed: User rejected the request</b>
      //       }

      //       return <b>Failed: check console for more details</b>
      //     }
      //   })
  
      //   await checkPromise
      // }

      if (group.guards.nftGate) {
        const ownedNfts = await metaplex.nfts().findAllByOwner({ owner: metaplex.identity().publicKey });
        const nftsInCollection = ownedNfts.filter(obj => {
          return (obj.collection?.address.toBase58() === group.guards.nftGate.requiredCollection.toBase58()) && (obj.collection?.verified === true);
        });

        const mintPromise = metaplex?.candyMachines().mint({
          candyMachine,
          collectionUpdateAuthority: candyMachine.authorityAddress,
          group: group.label,
          guards: {
            nftGate: {
              mint: sample(nftsInCollection).mintAddress
            },
          }
        });
  
        toast.promise(mintPromise, {
          loading: 'Minting...',
          success: <b>Success!</b>,
          error: err => {
            console.error(err);
            return <b>Mint failed. Check the console for more details</b>
          }
        })
  
        const { nft }: { nft: any } = await mintPromise
  
        return setNft(nft);
      }

      if (group.guards.nftBurn) {
        const ownedNfts = await metaplex.nfts().findAllByOwner({ owner: metaplex.identity().publicKey });
        const nftsInCollection = ownedNfts.filter(obj => {
          return (obj.collection?.address.toBase58() === group.guards.nftBurn.requiredCollection.toBase58()) && (obj.collection?.verified === true);
        });

        const mint = sample(nftsInCollection).mintAddress;

        const mintPromise = metaplex?.candyMachines().mint({
          candyMachine,
          collectionUpdateAuthority: candyMachine.authorityAddress,
          group: group.label,
          guards: {
            nftBurn: {
              mint
            },
          }
        });
  
        toast.promise(mintPromise, {
          loading: 'Minting...',
          success: <b>Success!</b>,
          error: err => {
            console.error(err);
            return <b>Mint failed. Check the console for more details</b>
          }
        })
  
        const { nft }: { nft: any } = await mintPromise
  
        return setNft(nft);
      }

      console.log('WEE')
      

      // Here the actual mint happens. Depending on the guards that you are using you have to run some pre validation beforehand 
      // Read more: https://docs.metaplex.com/programs/candy-machine/minting#minting-with-pre-validation
      const mintPromise = metaplex?.candyMachines().mint({
        candyMachine,
        collectionUpdateAuthority: candyMachine.authorityAddress,
        group: group.label
      });

      toast.promise(mintPromise, {
        loading: 'Minting...',
        success: <b>Success!</b>,
        error: err => {
          console.error(err);
          return <b>Mint failed. Check the console for more details</b>
        }
      })

      const { nft }: { nft: any } = await mintPromise

      setNft(nft);
    } catch (err) {
      console.log(err)
      toast.error('Mint unsuccessful')
    } finally {
      setMinting(false)
    }
    
  };

  const eligibleGroup = groupsWithEligibility.find(g => g.label === activeGroup);

  return (
    <>
      <Card className="main-window">
        <CardContent>
          <Stack direction="row" spacing={5} sx={{justifyContent: 'space-around'}} className="main-stack">
            {
              !!(groupsWithEligibility.length) && (
                <Tabs value={activeGroup} orientation="vertical">
                  {
                    groupsWithEligibility.map((item, index) => {
                      return <Tab key={index} value={item.label} onClick={() => setActiveGroup(item.label)} label={item.label === 'LGCY' ? 'Legacy' : item.label} />
                    })
                  }
                </Tabs>
              )
            }
            <Stack sx={{flexGrow: 1, maxWidth: 500 }} spacing={2} className="mint-now">
              {
                activeGroup && <ActiveGroup group={eligibleGroup} onExpired={refreshCandyMachine} />
              }
              <Button onClick={onClick} disabled={disableMint || minting || !activeGroup || !eligibleGroup || !eligibleGroup.canMint} variant="contained" className="mint-button">
                mint NFT
                {minting && <CircularProgress />}
              </Button>
              {
                status && <Typography variant="h3">{status}</Typography>
              }
              {
                candyMachine && <MintProgress candyMachine={candyMachine} totalMinted={totalMinted} totalAvailable={totalAvailable} activeGroup={activeGroup} />
              }
              {
                activeGroup === '$BONK' && <a href="https://jup.ag/swap/SOL-Bonk" className="solbonk" target="_blank">SOL > $BONK</a>
              }
            </Stack>
            <img src="/nfts.gif"className="nft-samples"/>
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
          </Stack>
         
        </CardContent>
      </Card>
      {
        next && <div className="next-phase"><Next next={next}/></div>
      }
    </>
  );
};
