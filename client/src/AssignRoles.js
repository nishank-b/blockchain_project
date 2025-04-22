import React, { useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";
import Web3 from "web3";
import SupplyChainABI from "./artifacts/SupplyChain.json";
import './AssignRoles.css';

function AssignRoles() {
    const history = useHistory();
    const [currentAccount, setCurrentAccount] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [supplyChain, setSupplyChain] = useState(null);
    const [roles, setRoles] = useState({
        rms: [],
        man: [],
        dis: [],
        ret: []
    });
    const [newRole, setNewRole] = useState({
        address: "",
        name: "",
        place: "",
        type: "rms"
    });

    useEffect(() => {
        const init = async () => {
            await loadWeb3();
            await loadBlockchainData();
        };
        init();
    }, []);

    const loadWeb3 = async () => {
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum);
            await window.ethereum.enable();
        } else if (window.web3) {
            window.web3 = new Web3(window.web3.currentProvider);
        } else {
            window.alert("Non-Ethereum browser detected. Consider using MetaMask!");
        }
    };

    const loadBlockchainData = async () => {
        setIsLoading(true);
        try {
            const web3 = window.web3;
            const accounts = await web3.eth.getAccounts();
            setCurrentAccount(accounts[0]);
            
            const networkId = await web3.eth.net.getId();
            const networkData = SupplyChainABI.networks[networkId];
            
            if (!networkData) {
                throw new Error('Smart contract not deployed to current network');
            }

            const contract = new web3.eth.Contract(SupplyChainABI.abi, networkData.address);
            setSupplyChain(contract);

            const [rmsCount, manCount, disCount, retCount] = await Promise.all([
                contract.methods.rmsCtr().call(),
                contract.methods.manCtr().call(),
                contract.methods.disCtr().call(),
                contract.methods.retCtr().call()
            ]);

            const loadRoles = async (method, count) => {
                const results = [];
                for (let i = 1; i <= count; i++) {
                    results.push(await method(i).call());
                }
                return results;
            };

            const [rms, man, dis, ret] = await Promise.all([
                loadRoles(contract.methods.RMS, rmsCount),
                loadRoles(contract.methods.MAN, manCount),
                loadRoles(contract.methods.DIS, disCount),
                loadRoles(contract.methods.RET, retCount)
            ]);

            setRoles({ rms, man, dis, ret });
            setIsLoading(false);
        } catch (error) {
            console.error("Error loading blockchain data:", error);
            window.alert(error.message);
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewRole(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleSubmit = async (e) => {
        e.preventDefault();
        const { address, name, place, type } = newRole;
        
        if (!address || !name || !place) {
            alert("Please fill all fields");
            return;
        }

        try {
            let receipt;
            switch (type) {
                case "rms":
                    receipt = await supplyChain.methods.addRMS(address, name, place)
                        .send({ from: currentAccount });
                    break;
                case "man":
                    receipt = await supplyChain.methods.addManufacturer(address, name, place)
                        .send({ from: currentAccount });
                    break;
                case "dis":
                    receipt = await supplyChain.methods.addDistributor(address, name, place)
                        .send({ from: currentAccount });
                    break;
                case "ret":
                    receipt = await supplyChain.methods.addRetailer(address, name, place)
                        .send({ from: currentAccount });
                    break;
                default:
                    alert("Invalid role type");
                    return;
            }

            if (receipt) {
                await loadBlockchainData();
                setNewRole({
                    address: "",
                    name: "",
                    place: "",
                    type: "rms"
                });
            }
        } catch (error) {
            console.error("Error registering role:", error);
            alert("Failed to register role: " + error.message);
        }
    };

    const goHome = () => history.push('/');

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading roles data...</p>
            </div>
        );
    }

    return (
        <div className="roles-container">
            <div className="page-header">
                <h1>Role Management</h1>
                <div className="account-info">
                    <span>Connected as: {currentAccount}</span>
                    <button onClick={goHome} className="btn home-btn">
                        Back to Home
                    </button>
                </div>
            </div>

            <div className="card register-role-card">
                <h2>Register New Role</h2>
                <form onSubmit={handleRoleSubmit} className="role-form">
                    <div className="form-group">
                        <label>Role Type</label>
                        <select
                            name="type"
                            value={newRole.type}
                            onChange={handleInputChange}
                            className="form-control"
                        >
                            <option value="rms">Raw Material Supplier</option>
                            <option value="man">Manufacturer</option>
                            <option value="dis">Distributor</option>
                            <option value="ret">Retailer</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Ethereum Address</label>
                        <input
                            type="text"
                            name="address"
                            value={newRole.address}
                            onChange={handleInputChange}
                            placeholder="0x..."
                            className="form-control"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            name="name"
                            value={newRole.name}
                            onChange={handleInputChange}
                            placeholder="Organization Name"
                            className="form-control"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Location</label>
                        <input
                            type="text"
                            name="place"
                            value={newRole.place}
                            onChange={handleInputChange}
                            placeholder="Based In"
                            className="form-control"
                            required
                        />
                    </div>

                    <button type="submit" className="btn submit-btn">
                        Register Role
                    </button>
                </form>
            </div>

            <div className="roles-list">
                <div className="role-category">
                    <h3>Raw Material Suppliers</h3>
                    <div className="role-table-container">
                        {roles.rms.length > 0 ? (
                            <table className="role-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Location</th>
                                        <th>Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.rms.map((role, index) => (
                                        <tr key={index}>
                                            <td>{role.id}</td>
                                            <td>{role.name}</td>
                                            <td>{role.place}</td>
                                            <td className="address-cell">{role.addr}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="no-roles">No suppliers registered</p>
                        )}
                    </div>
                </div>

                <div className="role-category">
                    <h3>Manufacturers</h3>
                    <div className="role-table-container">
                        {roles.man.length > 0 ? (
                            <table className="role-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Location</th>
                                        <th>Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.man.map((role, index) => (
                                        <tr key={index}>
                                            <td>{role.id}</td>
                                            <td>{role.name}</td>
                                            <td>{role.place}</td>
                                            <td className="address-cell">{role.addr}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="no-roles">No manufacturers registered</p>
                        )}
                    </div>
                </div>

                <div className="role-category">
                    <h3>Distributors</h3>
                    <div className="role-table-container">
                        {roles.dis.length > 0 ? (
                            <table className="role-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Location</th>
                                        <th>Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.dis.map((role, index) => (
                                        <tr key={index}>
                                            <td>{role.id}</td>
                                            <td>{role.name}</td>
                                            <td>{role.place}</td>
                                            <td className="address-cell">{role.addr}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="no-roles">No distributors registered</p>
                        )}
                    </div>
                </div>

                <div className="role-category">
                    <h3>Retailers</h3>
                    <div className="role-table-container">
                        {roles.ret.length > 0 ? (
                            <table className="role-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Location</th>
                                        <th>Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.ret.map((role, index) => (
                                        <tr key={index}>
                                            <td>{role.id}</td>
                                            <td>{role.name}</td>
                                            <td>{role.place}</td>
                                            <td className="address-cell">{role.addr}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="no-roles">No retailers registered</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AssignRoles;