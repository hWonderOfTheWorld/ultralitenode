# Magma UltraLiteNode v0

The Ultra Litenode was created to make it easier run anywhere and participate in operating the network. 
The difference between Ultra Litenode and Litenode is the Block Stream Sampling

### How to use
* Create a new Keypair (strongly advised)
* Register as node on chain
* Sign validation hash
* Use signature, public key, private key
* Download the lite client and add to repo
* Deploy (make sure your env vars are properly configured)

### Notes
* Its designed to run on pretty much any provder
* Key validation is critical. Bad streams slash validation bonds (you loose bond with too many slashes)
* Priority tips are equally split with broadcasting node and network
* Registered LST are only method compatible for bonding network to get node registration. 
* You will need an external RPC

Use: 
```
 ts-node ./api/index.ts 
 ```