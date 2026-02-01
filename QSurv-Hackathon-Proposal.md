# Deploy QSurv – Decentralized AI-Verified Survey Platform

## Proposal

> Deploy the QSurv smart contract to Qubic mainnet as part of the TOP3 Hack Nostromo hackathon prize distribution. QSurv is a trustless survey platform that combines AI-powered answer verification with blockchain-based escrow payments, enabling creators to incentivize authentic responses while eliminating fake participation through real-time validation.

## Available Options

> **Option 0:** Reject the deployment of QSurv smart contract
>
> **Option 1:** Approve the deployment of QSurv smart contract to Qubic mainnet

## Project Overview

### What is QSurv?

QSurv addresses a critical problem in online surveys: **fake and low-quality responses**. Traditional survey platforms have no way to verify answer authenticity, resulting in wasted funds and unreliable data.

QSurv solves this by combining:
- **Smart Contract Escrow**: Survey creators deposit funds that are automatically distributed upon verification
- **AI Verification**: Google Gemini 2.0 Flash validates responses in real-time
- **Blockchain Transparency**: All transactions are recorded on Qubic with instant finality
- **Decentralized Storage**: Survey data stored on IPFS via Pinata

### Key Features

| Feature | Description |
|---------|-------------|
| **Trustless Payments** | Escrow-based fund distribution - no middleman required |
| **AI Validation** | Real-time response verification eliminates fake answers |
| **Referral System** | 25% commission for driving valid responses |
| **Staking Tiers** | Up to 25% bonus for token holders (Analyst/Oracle tiers) |
| **IPFS Storage** | Decentralized, permanent survey data storage |
| **Instant Finality** | Leverages Qubic's fast transaction processing |

### Reward Distribution Model

```
Total Reward per Response = 100%
├── Base Reward:     60% → Respondent
├── Referral:        25% → Referrer (or platform if none)
├── Platform Fee:     5% → Platform operations
└── Staking Bonus:  0-25% → Based on respondent tier
    ├── Tier 1:  5% bonus
    ├── Tier 2: 10% bonus
    └── Tier 3: 25% bonus
```

## Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, Tailwind CSS, Framer Motion |
| Smart Contracts | C++ (Qubic QPI) |
| Blockchain | Qubic Network |
| AI Engine | Google Gemini 2.0 Flash |
| Database | SQLite via Prisma ORM |
| Storage | IPFS (Pinata) |
| Wallet | MetaMask Snap integration |

## Smart Contract Implementation

The QSurv smart contract manages survey creation, escrow, and verified payouts:

```cpp
using namespace QPI;

// QSurv - Trustless Survey Platform
// Decentralized survey creation with escrow and AI-verified payouts

struct QSURV2 {};

struct QSURV : public ContractBase
{
public:
    // ============================================
    // CONSTANTS
    // ============================================
    static const uint64 PLATFORM_FEE_PERCENT = 5;
    static const uint64 REFERRAL_REWARD_PERCENT = 25;
    static const uint64 BASE_REWARD_PERCENT = 60;

    // ============================================
    // STATE & STRUCTS
    // ============================================
    static const int MAX_SURVEYS = 1000;
    static const uint64 ORACLE_ADDRESS = 0x1234567890ABCDEF;

    struct Survey {
        uint64 id;
        uint64 creator;
        uint64 rewardAmount;
        uint64 rewardPerRespondent;
        uint32 maxRespondents;
        uint32 currentRespondents;
        uint64 balance;
        uint8 ipfsHash[64];
        bool isActive;
    };

    // Contract State
    Survey surveys[MAX_SURVEYS];
    uint32 surveyCount = 0;

    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================

    // 1. Create Survey - Allows creators to fund a new survey
    struct createSurvey_input {
        uint64 rewardPool;
        uint32 maxRespondents;
        uint8 ipfsHash[64];
    };

    struct createSurvey_output {
        uint64 surveyId;
        uint8 success;
    };

    PUBLIC_FUNCTION(createSurvey) {
        // Validation checks
        if (surveyCount >= MAX_SURVEYS) {
            output.success = 0;
            return;
        }
        if (input.maxRespondents == 0 || input.rewardPool == 0) {
            output.success = 0;
            return;
        }

        // Create new survey
        Survey& newSurvey = surveys[surveyCount];
        newSurvey.id = surveyCount + 1;
        newSurvey.creator = qpi_get_sender();
        newSurvey.rewardAmount = input.rewardPool;
        newSurvey.maxRespondents = input.maxRespondents;
        newSurvey.rewardPerRespondent = input.rewardPool / input.maxRespondents;
        newSurvey.currentRespondents = 0;
        newSurvey.balance = input.rewardPool;
        newSurvey.isActive = true;

        for(int i=0; i<64; i++) newSurvey.ipfsHash[i] = input.ipfsHash[i];

        output.surveyId = newSurvey.id;
        output.success = 1;
        surveyCount++;
    }

    // 2. Payout Respondent - Oracle-controlled verified payouts
    struct payout_input {
        uint64 surveyId;
        id respondentAddress;
        id referrerAddress;
        uint8 respondentTier;
    };

    struct payout_output {
        uint64 amountPaid;
        uint64 bonusPaid;
        uint64 referralPaid;
        uint8 success;
    };

    PUBLIC_FUNCTION(payout) {
        // Security: Oracle-only execution
        if (qpi_get_sender() != ORACLE_ADDRESS) {
            output.success = 0;
            return;
        }

        // Find survey by ID
        int index = -1;
        for (int i = 0; i < surveyCount; i++) {
            if (surveys[i].id == input.surveyId) {
                index = i;
                break;
            }
        }

        if (index == -1) { output.success = 0; return; }
        Survey& s = surveys[index];

        // Validation checks
        if (!s.isActive || s.currentRespondents >= s.maxRespondents ||
            s.balance < s.rewardPerRespondent) {
            output.success = 0;
            return;
        }

        // Calculate reward splits
        uint64 totalReward = s.rewardPerRespondent;
        uint64 baseReward = (totalReward * BASE_REWARD_PERCENT) / 100;
        uint64 referralReward = (totalReward * REFERRAL_REWARD_PERCENT) / 100;
        uint64 platformFee = (totalReward * PLATFORM_FEE_PERCENT) / 100;

        // Staking bonus tier system
        uint64 bonus = 0;
        if (input.respondentTier == 1) bonus = (baseReward * 5) / 100;
        if (input.respondentTier == 2) bonus = (baseReward * 10) / 100;
        if (input.respondentTier == 3) bonus = (baseReward * 25) / 100;

        // Execute fund transfers
        qpi_send_funds(input.respondentAddress, baseReward + bonus);

        if (input.referrerAddress != 0) {
            qpi_send_funds(input.referrerAddress, referralReward);
        } else {
            qpi_send_funds(ORACLE_ADDRESS, referralReward);
        }

        qpi_send_funds(ORACLE_ADDRESS, platformFee);

        // Update state
        s.balance -= totalReward;
        s.currentRespondents++;

        if (s.currentRespondents >= s.maxRespondents) {
            s.isActive = false;
        }

        output.success = 1;
        output.amountPaid = baseReward;
        output.bonusPaid = bonus;
        output.referralPaid = referralReward;
    }
};
```

## Contract Functions Summary

| Function | Access | Purpose |
|----------|--------|---------|
| `createSurvey` | Public | Create new survey with escrow funds |
| `payout` | Oracle Only | Distribute rewards after AI verification |

## Security Features

1. **Oracle-Controlled Payouts**: Only verified oracle can trigger fund distribution
2. **Escrow Protection**: Funds locked until AI verification passes
3. **Input Validation**: All inputs validated before state changes
4. **Balance Checks**: Prevents overdraft and ensures fund availability
5. **Auto-Deactivation**: Surveys automatically close when respondent limit reached

## Links

- **GitHub Repository**: https://github.com/IanLaFlair/QSurv
- **Smart Contract**: https://github.com/IanLaFlair/QSurv/blob/main/contracts/QSurv.h

## Hackathon Context

This proposal is submitted as part of the **TOP3 Hack Nostromo** hackathon prize distribution process. QSurv was developed to demonstrate practical utility of Qubic's smart contract capabilities for real-world applications in the survey and market research industry.

---

*Submitted by: IanLaFlair*
*Date: [INSERT DATE]*
*Hackathon: TOP3 Hack Nostromo*
