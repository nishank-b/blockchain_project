import React, { useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";
import Web3 from "web3";
import SupplyChainABI from "./artifacts/SupplyChain.json";
import './Supply.css';

function Supply() {
    const history = useHistory();
    const [currentAccount, setCurrentAccount] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [supplyChain, setSupplyChain] = useState(null);
    const [medicines, setMedicines] = useState({});
    const [medicineStages, setMedicineStages] = useState({});
    const [selectedId, setSelectedId] = useState("");
    const [activeStep, setActiveStep] = useState(null);

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

    const handleProcessStep = async (step) => {
        if (!selectedId) {
            alert("Please select a Component first");
            return;
        }

        try {
            let receipt;
            switch (step) {
                case 'supply':
                    receipt = await supplyChain.methods.RMSsupply(selectedId)
                        .send({ from: currentAccount });
                    break;
                case 'manufacture':
                    receipt = await supplyChain.methods.Manufacturing(selectedId)
                        .send({ from: currentAccount });
                    break;
                case 'distribute':
                    receipt = await supplyChain.methods.Distribute(selectedId)
                        .send({ from: currentAccount });
                    break;
                case 'retail':
                    receipt = await supplyChain.methods.Retail(selectedId)
                        .send({ from: currentAccount });
                    break;
                case 'sold':
                    receipt = await supplyChain.methods.sold(selectedId)
                        .send({ from: currentAccount });
                    break;
                default:
                    alert("Invalid process step");
                    return;
            }

            if (receipt) {
                await loadBlockchainData();
                alert(`Component ${selectedId} successfully processed to ${step} stage`);
                setSelectedId("");
                setActiveStep(null);
            }
        } catch (error) {
            console.error("Error processing step:", error);
            alert("Failed to process: " + (error.message || "Check console for details"));
        }
    };

    const goHome = () => history.push('/');

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading supply chain data...</p>
            </div>
        );
    }

    return (
        <div className="supply-container">
            <div className="page-header">
                <h1>Supply Chain Processing</h1>
                <div className="account-info">
                    <span>Connected as: {currentAccount}</span>
                    <button onClick={goHome} className="btn home-btn">
                        Back to Home
                    </button>
                </div>
            </div>

            <div className="card supply-overview">
                <h2>Component Inventory</h2>
                {Object.keys(medicines).length > 0 ? (
                    <div className="table-responsive">
                        <table className="inventory-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Current Stage</th>
                                    <th>Select</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(medicines).map(key => {
                                    const med = medicines[key];
                                    return (
                                        <tr key={key} className={selectedId === key ? 'selected' : ''}>
                                            <td>{med.id}</td>
                                            <td>{med.name}</td>
                                            <td>{med.description}</td>
                                            <td>
                                                <span className={`stage-badge stage-${med.stage || 0}`}>
                                                    {medicineStages[key]}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    onClick={() => setSelectedId(key)}
                                                    className="btn select-btn"
                                                >
                                                    {selectedId === key ? 'Selected' : 'Select'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="no-items">No batteries in inventory</p>
                )}
            </div>

            {selectedId && (
                <div className="card process-steps">
                    <h2>Process Selected Component (ID: {selectedId})</h2>
                    <p className="current-stage">
                        Current Stage: <strong>{medicineStages[selectedId]}</strong>
                    </p>

                    <div className="steps-container">
                        <div 
                            className={`step-card ${medicines[selectedId].stage >= 0 ? 'completed' : ''} ${activeStep === 'supply' ? 'active' : ''}`}
                            onClick={() => setActiveStep('supply')}
                        >
                            <div className="step-number">1</div>
                            <h3>Supply Raw Materials</h3>
                            <p>Only Raw Material Suppliers can perform this step</p>
                            {activeStep === 'supply' && (
                                <button 
                                    onClick={() => handleProcessStep('supply')}
                                    className="btn process-btn"
                                >
                                    Process
                                </button>
                            )}
                        </div>

                        <div 
                            className={`step-card ${medicines[selectedId].stage >= 1 ? 'completed' : ''} ${activeStep === 'manufacture' ? 'active' : ''}`}
                            onClick={() => setActiveStep('manufacture')}
                        >
                            <div className="step-number">2</div>
                            <h3>Manufacture Component</h3>
                            <p>Only Manufacturers can perform this step</p>
                            {activeStep === 'manufacture' && (
                                <button 
                                    onClick={() => handleProcessStep('manufacture')}
                                    className="btn process-btn"
                                >
                                    Process
                                </button>
                            )}
                        </div>

                        <div 
                            className={`step-card ${medicines[selectedId].stage >= 2 ? 'completed' : ''} ${activeStep === 'distribute' ? 'active' : ''}`}
                            onClick={() => setActiveStep('distribute')}
                        >
                            <div className="step-number">3</div>
                            <h3>Distribute Component</h3>
                            <p>Only Distributors can perform this step</p>
                            {activeStep === 'distribute' && (
                                <button 
                                    onClick={() => handleProcessStep('distribute')}
                                    className="btn process-btn"
                                >
                                    Process
                                </button>
                            )}
                        </div>

                        <div 
                            className={`step-card ${medicines[selectedId].stage >= 3 ? 'completed' : ''} ${activeStep === 'retail' ? 'active' : ''}`}
                            onClick={() => setActiveStep('retail')}
                        >
                            <div className="step-number">4</div>
                            <h3>Retail Component</h3>
                            <p>Only Retailers can perform this step</p>
                            {activeStep === 'retail' && (
                                <button 
                                    onClick={() => handleProcessStep('retail')}
                                    className="btn process-btn"
                                >
                                    Process
                                </button>
                            )}
                        </div>

                        <div 
                            className={`step-card ${medicines[selectedId].stage >= 4 ? 'completed' : ''} ${activeStep === 'sold' ? 'active' : ''}`}
                            onClick={() => setActiveStep('sold')}
                        >
                            <div className="step-number">5</div>
                            <h3>Mark as Sold</h3>
                            <p>Only Retailers can perform this step</p>
                            {activeStep === 'sold' && (
                                <button 
                                    onClick={() => handleProcessStep('sold')}
                                    className="btn process-btn"
                                >
                                    Process
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Supply;