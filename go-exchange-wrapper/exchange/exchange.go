package exchange

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"math/big"
	"ton/exchange/types"

	"github.com/xssnick/tonutils-go/address"
	"github.com/xssnick/tonutils-go/tlb"
	"github.com/xssnick/tonutils-go/ton"
	"github.com/xssnick/tonutils-go/ton/jetton"
	"github.com/xssnick/tonutils-go/ton/wallet"
)

const (
	fwdPayloadAmount = "0.7"
	tonValue         = "1.0"
)

type Exchange struct {
	v4Wallet  *wallet.Wallet
	apiClient *ton.APIClient
	ctx       context.Context

	deployerAddress string
}

func NewExchange(v4Wallet *wallet.Wallet, apiClient *ton.APIClient, ctx context.Context, deployerAddress string) *Exchange {
	return &Exchange{v4Wallet: v4Wallet, apiClient: apiClient, ctx: ctx, deployerAddress: deployerAddress}
}

func (e *Exchange) CreateJ2JOrder(order *types.J2JOrder) error {
	// find our jetton wallet
	var token *jetton.Client
	switch order.Side {
	case types.Buy:
		token = jetton.NewJettonMasterClient(e.apiClient, address.MustParseAddr(order.QuoteMasterAddress))
	case types.Sell:
		token = jetton.NewJettonMasterClient(e.apiClient, address.MustParseAddr(order.BaseMasterAddress))
	default:
		return fmt.Errorf("wrong order side %d", order.Side)
	}

	tokenWallet, err := token.GetJettonWallet(e.ctx, e.v4Wallet.WalletAddress())

	if err != nil {
		return err
	}

	orderPayload := order.ForwardPayload()
	to := address.MustParseAddr(e.deployerAddress)

	body, err := tokenWallet.BuildTransferPayloadV2(to, e.v4Wallet.Address(),
		tlb.MustFromTON(order.JettonAmount),
		tlb.MustFromTON(fwdPayloadAmount), orderPayload, nil)

	if err != nil {
		log.Fatal(err)
	}

	msg := wallet.SimpleMessage(tokenWallet.Address(), tlb.MustFromTON(tonValue), body)

	log.Println("create J2J order...")
	err = e.sendTransaction(msg)

	if err != nil {
		return err
	}

	return nil
}

func (e *Exchange) CloseJ2JOrder(close *types.J2JClose) error {
	// find our jetton wallet
	token := jetton.NewJettonMasterClient(e.apiClient, address.MustParseAddr(close.MasterAddress))
	tokenWallet, err := token.GetJettonWallet(e.ctx, e.v4Wallet.WalletAddress())

	if err != nil {
		return err
	}

	closePayload := close.ForwardPayload()
	to := address.MustParseAddr(close.OrderAddress)

	body, err := tokenWallet.BuildTransferPayloadV2(to, e.v4Wallet.Address(),
		tlb.MustFromTON(close.JettonAmount),
		tlb.MustFromTON(fwdPayloadAmount), closePayload, nil)

	if err != nil {
		log.Fatal(err)
	}

	log.Printf("log body J2J close: %s\n", body.Dump())

	msg := wallet.SimpleMessage(tokenWallet.Address(), tlb.MustFromTON(tonValue), body)

	log.Println("close J2J order...")
	err = e.sendTransaction(msg)

	if err != nil {
		return err
	}

	return nil
}

func (e *Exchange) CreateJ2TOrder(order *types.J2TOrder) error {
	// find our jetton wallet
	token := jetton.NewJettonMasterClient(e.apiClient, address.MustParseAddr(order.MasterAddress))
	tokenWallet, err := token.GetJettonWallet(e.ctx, e.v4Wallet.WalletAddress())

	if err != nil {
		return err
	}

	orderPayload := order.ForwardPayload()
	to := address.MustParseAddr(e.deployerAddress)

	body, err := tokenWallet.BuildTransferPayloadV2(to, e.v4Wallet.Address(), tlb.MustFromTON(order.JettonAmount), tlb.MustFromTON(fwdPayloadAmount), orderPayload, nil)

	if err != nil {
		log.Fatal(err)
	}

	log.Printf("log body J2T create: %s\n", body.Dump())

	msg := wallet.SimpleMessage(tokenWallet.Address(), tlb.MustFromTON(tonValue), body)

	log.Println("create J2T order...")
	err = e.sendTransaction(msg)

	if err != nil {
		return err
	}

	return nil
}

func (e *Exchange) CloseJ2TOrder(close *types.J2TClose) error {
	body := close.Payload(9)

	log.Printf("log body close J2T: %s\n", body.Dump())

	to := address.MustParseAddr(close.OrderAddress)

	sumCoins := new(big.Int)
	sumCoins.Add(tlb.MustFromTON(tonValue).Nano(), tlb.MustFromTON(close.Coins).Nano())

	msg := wallet.SimpleMessage(to, tlb.FromNanoTON(sumCoins), body)

	log.Println("close J2T order...")
	err := e.sendTransaction(msg)

	if err != nil {
		return err
	}

	return nil
}

func (e *Exchange) CreateT2JOrder(order *types.T2JOrder) error {
	body := order.Payload(9)

	log.Printf("log body create T2J: %s\n", body.Dump())

	to := address.MustParseAddr(e.deployerAddress)

	msg := wallet.SimpleMessage(to, tlb.MustFromTON(tonValue), body)

	log.Println("create T2J order...")
	err := e.sendTransaction(msg)

	if err != nil {
		return err
	}

	return nil
}

func (e *Exchange) CloseT2JOrder(order *types.T2JClose) error {
	// find our jetton wallet
	token := jetton.NewJettonMasterClient(e.apiClient, address.MustParseAddr(order.MasterAddress))
	tokenWallet, err := token.GetJettonWallet(e.ctx, e.v4Wallet.WalletAddress())

	if err != nil {
		return err
	}

	to := address.MustParseAddr(order.OrderAddress)

	body, err := tokenWallet.BuildTransferPayloadV2(to, e.v4Wallet.Address(), tlb.MustFromTON(order.JettonAmount), tlb.MustFromTON(fwdPayloadAmount), nil, nil)

	if err != nil {
		log.Fatal(err)
	}

	msg := wallet.SimpleMessage(tokenWallet.Address(), tlb.MustFromTON(tonValue), body)

	log.Println("close T2J order...")
	err = e.sendTransaction(msg)

	if err != nil {
		return err
	}

	return nil
}

func (e *Exchange) sendTransaction(msg *wallet.Message) error {
	tx, _, err := e.v4Wallet.SendWaitTransaction(e.ctx, msg)
	if err != nil {
		return err
	}
	log.Println("transaction confirmed, hash:", base64.StdEncoding.EncodeToString(tx.Hash))
	return nil
}
