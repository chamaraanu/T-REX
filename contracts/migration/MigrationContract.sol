// SPDX-License-Identifier: GPL-3.0
//
//                                             :+#####%%%%%%%%%%%%%%+
//                                         .-*@@@%+.:+%@@@@@%%#***%@@%=
//                                     :=*%@@@#=.      :#@@%       *@@@%=
//                       .-+*%@%*-.:+%@@@@@@+.     -*+:  .=#.       :%@@@%-
//                   :=*@@@@%%@@@@@@@@@%@@@-   .=#@@@%@%=             =@@@@#.
//             -=+#%@@%#*=:.  :%@@@@%.   -*@@#*@@@@@@@#=:-              *@@@@+
//            =@@%=:.     :=:   *@@@@@%#-   =%*%@@@@#+-.        =+       :%@@@%-
//           -@@%.     .+@@@     =+=-.         @@#-           +@@@%-       =@@@@%:
//          :@@@.    .+@@#%:                   :    .=*=-::.-%@@@+*@@=       +@@@@#.
//          %@@:    +@%%*                         =%@@@@@@@@@@@#.  .*@%-       +@@@@*.
//         #@@=                                .+@@@@%:=*@@@@@-      :%@%:      .*@@@@+
//        *@@*                                +@@@#-@@%-:%@@*          +@@#.      :%@@@@-
//       -@@%           .:-=++*##%%%@@@@@@@@@@@@*. :@+.@@@%:            .#@@+       =@@@@#:
//      .@@@*-+*#%%%@@@@@@@@@@@@@@@@%%#**@@%@@@.   *@=*@@#                :#@%=      .#@@@@#-
//      -%@@@@@@@@@@@@@@@*+==-:-@@@=    *@# .#@*-=*@@@@%=                 -%@@@*       =@@@@@%-
//         -+%@@@#.   %@%%=   -@@:+@: -@@*    *@@*-::                   -%@@%=.         .*@@@@@#
//            *@@@*  +@* *@@##@@-  #@*@@+    -@@=          .         :+@@@#:           .-+@@@%+-
//             +@@@%*@@:..=@@@@*   .@@@*   .#@#.       .=+-       .=%@@@*.         :+#@@@@*=:
//              =@@@@%@@@@@@@@@@@@@@@@@@@@@@%-      :+#*.       :*@@@%=.       .=#@@@@%+:
//               .%@@=                 .....    .=#@@+.       .#@@@*:       -*%@@@@%+.
//                 +@@#+===---:::...         .=%@@*-         +@@@+.      -*@@@@@%+.
//                  -@@@@@@@@@@@@@@@@@@@@@@%@@@@=          -@@@+      -#@@@@@#=.
//                    ..:::---===+++***###%%%@@@#-       .#@@+     -*@@@@@#=.
//                                           @@@@@@+.   +@@*.   .+@@@@@%=.
//                                          -@@@@@=   =@@%:   -#@@@@%+.
//                                          +@@@@@. =@@@=  .+@@@@@*:
//                                          #@@@@#:%@@#. :*@@@@#-
//                                          @@@@@%@@@= :#@@@@+.
//                                         :@@@@@@@#.:#@@@%-
//                                         +@@@@@@-.*@@@*:
//                                         #@@@@#.=@@@+.
//                                         @@@@+-%@%=
//                                        :@@@#%@%=
//                                        +@@@@%-
//                                        :#%%=
//
/**
 *     NOTICE
 *
 *     The T-REX software is licensed under a proprietary license or the GPL v.3.
 *     If you choose to receive it under the GPL v.3 license, the following applies:
 *     T-REX is a suite of smart contracts implementing the ERC-3643 standard and
 *     developed by Tokeny to manage and transfer financial assets on EVM blockchains
 *
 *     Copyright (C) 2023, Tokeny sàrl.
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
pragma solidity 0.8.17;

import "../roles/AgentRole.sol";
import "../token/IToken.sol";
import "../registry/interface/IClaimTopicsRegistry.sol";
import "../registry/interface/IIdentityRegistry.sol";
import "../compliance/modular/IModularCompliance.sol";
import "../registry/interface/ITrustedIssuersRegistry.sol";
import "../registry/interface/IIdentityRegistryStorage.sol";
import "../proxy/authority/ITREXImplementationAuthority.sol";
import "../proxy/ClaimTopicsRegistryProxy.sol";
import "../proxy/IdentityRegistryProxy.sol";
import "../proxy/IdentityRegistryStorageProxy.sol";
import "../proxy/TrustedIssuersRegistryProxy.sol";
import "../proxy/ModularComplianceProxy.sol";
import "@onchain-id/solidity/contracts/factory/IIdFactory.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";


contract MigrationContract is  Ownable {

    struct ClaimDetails {
        // claim topics required
        uint256[] claimTopics;
        // trusted issuers addresses
        IClaimIssuer[] issuers;
        // claims that issuers are allowed to emit, by index, index corresponds to the `issuers` indexes
        uint256[][] issuerClaims;
    }

    /// the address of ONCHAINID Factory for the deployment of Token OIDs
    address private _idFactory;

    /// the address of the implementation authority contract used in the tokens deployed by the factory
    address private _implementationAuthority;

    /// event emitted whenever a single contract is deployed by the migration contract
    event Deployed(address indexed _addr);

    /// event emitted when the implementation authority used by the migration contract is set
    event ImplementationAuthoritySet(address _implementationAuthority);

    /// event emitted when the Identity factory contract is set
    event IdFactorySet(address _implementationAuthority);

    /// event emitted by the migration contract when a migration has been processed
    event TREXSuiteMigrated(address indexed _token, address _ir, address _irs, address _tir, address _ctr, address
    _mc);

    /// constructor is setting the implementation authority of the migration contract
    constructor(address implementationAuthority_, address idFactory_) {
        setImplementationAuthority(implementationAuthority_);
        setIdFactory(idFactory_);
    }

    /**
     *  @dev Function allowing the migration from v3 to v4 of T-REX tokens previously
     *  deployed.
     *  The ownership of the token has to be previously given to the migration
     *  contract to ensure the process can work
     */
    // solhint-disable-next-line code-complexity, function-max-lines
    function migrateToken(address _token, bool _newIRS, address _tokenOwner, address[] memory _irAgents)
    external onlyOwner {
        require(Ownable(_token).owner() == address(this), "migration contract needs ownership");
        string memory _salt = Strings.toHexString(_token);

        console.log("Start migration. token: %s", _token);

        // recover Claim Details from old contracts
        ClaimDetails memory _claimDetails;
        _claimDetails.claimTopics = IToken(_token).identityRegistry().topicsRegistry().getClaimTopics();

        console.log("Claim topics");

        _claimDetails.issuers = IToken(_token).identityRegistry().issuersRegistry().getTrustedIssuers();

        console.log("Trusted issuers");

        for (uint256 i = 0; i < (_claimDetails.issuers).length; i++) {
            _claimDetails.issuerClaims[i] = IToken(_token).identityRegistry().issuersRegistry()
            .getTrustedIssuerClaimTopics(_claimDetails.issuers[i]);
        }

        console.log("Migration of claims completed.");

        ITrustedIssuersRegistry tir = ITrustedIssuersRegistry(_deployTIR(_salt, _implementationAuthority));
        IClaimTopicsRegistry ctr = IClaimTopicsRegistry(_deployCTR(_salt, _implementationAuthority));
        IModularCompliance mc = IModularCompliance(_deployMC(_salt, _implementationAuthority));
        IIdentityRegistryStorage irs;
        if (_newIRS) {
            irs = IIdentityRegistryStorage(_deployIRS(_salt, _implementationAuthority));
        }
        else {
            irs = IIdentityRegistryStorage(IIdentityRegistry(IToken(_token).identityRegistry()).identityStorage());
            irs.unbindIdentityRegistry(address(IToken(_token).identityRegistry()));

            console.log("old IR unbound from IRS");
        }
        IIdentityRegistry ir = IIdentityRegistry(_deployIR(_salt, _implementationAuthority, address(tir),
            address(ctr), address(irs)));

        console.log("New IR deployed");

        for (uint256 i = 0; i < (_claimDetails.claimTopics).length; i++) {
            ctr.addClaimTopic(_claimDetails.claimTopics[i]);
        }
        for (uint256 i = 0; i < (_claimDetails.issuers).length; i++) {
            tir.addTrustedIssuer(IClaimIssuer((_claimDetails).issuers[i]), _claimDetails.issuerClaims[i]);
        }
        irs.bindIdentityRegistry(address(ir));

        console.log("new IR bound to IRS");

        console.log("Migration of IR completed.");

        AgentRole(address(ir)).addAgent(_token);

        console.log("Token added as IR agent.");

        for (uint256 i = 0; i < _irAgents.length; i++) {
            AgentRole(address(ir)).addAgent(_irAgents[i]);
        }
        mc.bindToken(_token);

        console.log("New MC deployed");

        address _tokenID = IIdFactory(_idFactory).createTokenIdentity(_token, _tokenOwner, _salt);

        console.log("New token OID deployed");

        IToken(_token).setOnchainID(_tokenID);
        IToken(_token).setCompliance(address(mc));
        IToken(_token).setIdentityRegistry(address(ir));

        (Ownable(_token)).transferOwnership(_tokenOwner);
        (Ownable(address(ir))).transferOwnership(_tokenOwner);
        (Ownable(address(tir))).transferOwnership(_tokenOwner);
        (Ownable(address(ctr))).transferOwnership(_tokenOwner);
        (Ownable(address(mc))).transferOwnership(_tokenOwner);
        emit TREXSuiteMigrated(_token, address(ir), address(irs), address(tir), address(ctr), address(mc));
    }

    /**
     *  @dev See {ITREXFactory-recoverContractOwnership}.
     */
    function recoverContractOwnership(address _contract, address _newOwner) external onlyOwner {
        (Ownable(_contract)).transferOwnership(_newOwner);
    }

    /**
     *  @dev See {ITREXFactory-getImplementationAuthority}.
     */
    function getImplementationAuthority() external view returns(address) {
        return _implementationAuthority;
    }

    function getIdFactory() external view returns(address) {
        return _idFactory;
    }

    /**
     *  @dev See {ITREXFactory-setImplementationAuthority}.
     */
    function setImplementationAuthority(address implementationAuthority_) public onlyOwner {
        require(implementationAuthority_ != address(0), "invalid argument - zero address");
        // should not be possible to set an implementation authority that is not complete
        require(
            (ITREXImplementationAuthority(implementationAuthority_)).getTokenImplementation() != address(0)
            && (ITREXImplementationAuthority(implementationAuthority_)).getCTRImplementation() != address(0)
            && (ITREXImplementationAuthority(implementationAuthority_)).getIRImplementation() != address(0)
            && (ITREXImplementationAuthority(implementationAuthority_)).getIRSImplementation() != address(0)
            && (ITREXImplementationAuthority(implementationAuthority_)).getMCImplementation() != address(0)
            && (ITREXImplementationAuthority(implementationAuthority_)).getTIRImplementation() != address(0),
            "invalid Implementation Authority");
        _implementationAuthority = implementationAuthority_;
        emit ImplementationAuthoritySet(implementationAuthority_);
    }

    function setIdFactory(address idFactory_) public onlyOwner {
        require(idFactory_ != address(0), "invalid argument - zero address");
        _idFactory = idFactory_;
        emit IdFactorySet(idFactory_);
    }

    /// deploy function with create2 opcode call
    /// returns the address of the contract created
    function _deploy(string memory salt, bytes memory bytecode) private returns (address) {
        bytes32 saltBytes = bytes32(keccak256(abi.encodePacked(salt)));
        address addr;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let encoded_data := add(0x20, bytecode) // load initialization code.
            let encoded_size := mload(bytecode)     // load init code's length.
            addr := create2(0, encoded_data, encoded_size, saltBytes)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
        emit Deployed(addr);
        return addr;
    }

    /// function used to deploy a trusted issuers registry using CREATE2
    function _deployTIR
    (
        string memory _salt,
        address implementationAuthority_
    ) private returns (address){
        bytes memory _code = type(TrustedIssuersRegistryProxy).creationCode;
        bytes memory _constructData = abi.encode(implementationAuthority_);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return _deploy(_salt, bytecode);
    }

    /// function used to deploy a claim topics registry using CREATE2
    function  _deployCTR
    (
        string memory _salt,
        address implementationAuthority_
    ) private returns (address) {
        bytes memory _code = type(ClaimTopicsRegistryProxy).creationCode;
        bytes memory _constructData = abi.encode(implementationAuthority_);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return _deploy(_salt, bytecode);
    }

    /// function used to deploy modular compliance contract using CREATE2
    function  _deployMC
    (
        string memory _salt,
        address implementationAuthority_
    ) private returns (address) {
        bytes memory _code = type(ModularComplianceProxy).creationCode;
        bytes memory _constructData = abi.encode(implementationAuthority_);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return _deploy(_salt, bytecode);
    }

    /// function used to deploy an identity registry storage using CREATE2
    function _deployIRS
    (
        string memory _salt,
        address implementationAuthority_
    ) private returns (address) {
        bytes memory _code = type(IdentityRegistryStorageProxy).creationCode;
        bytes memory _constructData = abi.encode(implementationAuthority_);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return _deploy(_salt, bytecode);
    }

    /// function used to deploy an identity registry using CREATE2
    function _deployIR
    (
        string memory _salt,
        address implementationAuthority_,
        address _trustedIssuersRegistry,
        address _claimTopicsRegistry,
        address _identityStorage
    ) private returns (address) {
        bytes memory _code = type(IdentityRegistryProxy).creationCode;
        bytes memory _constructData = abi.encode
        (
            implementationAuthority_,
            _trustedIssuersRegistry,
            _claimTopicsRegistry,
            _identityStorage
        );
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return _deploy(_salt, bytecode);
    }
}
