import React, { useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";
import Web3 from "web3";
import SupplyChainABI from "./artifacts/SupplyChain.json";
import './AddMed.css';

function AddMed() {
    const history = useHistory();
    const [currentAccount, setCurrentAccount] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [supplyChain, setSupplyChain] = useState(null);
    const [medicines, setMedicines] = useState({});
    const [medicineStages, setMedicineStages] = useState({});
    const [newMedicine, setNewMedicine] = useState({
        name: "",
        description: ""
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

            const medCount = await contract.methods.medicineCtr().call();
            const meds = {};
            const stages = {};
            
            for (let i = 1; i <= medCount; i++) {
                meds[i] = await contract.methods.MedicineStock(i).call();
                stages[i] = await contract.methods.showStage(i).call();
            }

            setMedicines(meds);
            setMedicineStages(stages);
            setIsLoading(false);
        } catch (error) {
            console.error("Error loading blockchain data:", error);
            window.alert(error.message);
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewMedicine(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, description } = newMedicine;
        
        if (!name || !description) {
            alert("Please fill all fields");
            return;
        }

        try {
            const receipt = await supplyChain.methods.addMedicine(name, description)
                .send({ from: currentAccount });

            if (receipt) {
                await loadBlockchainData();
                setNewMedicine({
                    name: "",
                    description: ""
                });
                alert("Component order placed successfully!");
            }
        } catch (error) {
            console.error("Error adding component:", error);
            alert("Failed to place order: " + error.message);
        }
    };

    const goHome = () => history.push('/');

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading Components data...</p>
            </div>
        );
    }

    return (
        <div className="add-med-container">
            <div className="page-header">
                <h1>Component Order Management</h1>
                <div className="account-info">
                    <span>Connected as: {currentAccount}</span>
                    <button onClick={goHome} className="btn home-btn">
                        Back to Home
                    </button>
                </div>
            </div>

            <div className="card order-form-card">
                <h2>Place New Component Order</h2>
                <form onSubmit={handleSubmit} className="medicine-form">
                    <div className="form-group">
                        <label>Component Name</label>
                        <input
                            type="text"
                            name="name"
                            value={newMedicine.name}
                            onChange={handleInputChange}
                            placeholder="Enter component name"
                            className="form-control"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={newMedicine.description}
                            onChange={handleInputChange}
                            placeholder="Enter component description"
                            className="form-control"
                            rows="3"
                            required
                        ></textarea>
                    </div>

                    <button type="submit" className="btn submit-btn">
                        Place Order
                    </button>
                </form>
            </div>

            <div className="card orders-list-card">
                <h2>Current Component Orders</h2>
                {Object.keys(medicines).length > 0 ? (
                    <div className="table-responsive">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Current Stage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(medicines).map(key => {
                                    const med = medicines[key];
                                    return (
                                        <tr key={key}>
                                            <td>{med.id}</td>
                                            <td>{med.name}</td>
                                            <td>{med.description}</td>
                                            <td>
                                                <span className={`stage-badge stage-${med.stage || 0}`}>
                                                    {medicineStages[key]}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="no-orders">No Component orders found</p>
                )}
            </div>
        </div>
    );
}

export default AddMed;