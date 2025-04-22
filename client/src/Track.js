import React, { useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";
import Web3 from "web3";
import SupplyChainABI from "./artifacts/SupplyChain.json";
import { QRCodeCanvas } from 'qrcode.react';
import './Track.css'; // We'll create this CSS file

function Track() {
    const history = useHistory();
    const [currentAccount, setCurrentAccount] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [supplyChain, setSupplyChain] = useState(null);
    const [medicines, setMedicines] = useState({});
    const [medicineStages, setMedicineStages] = useState({});
    const [selectedId, setSelectedId] = useState(null);
    const [suppliers, setSuppliers] = useState({});
    const [manufacturers, setManufacturers] = useState({});
    const [distributors, setDistributors] = useState({});
    const [retailers, setRetailers] = useState({});
    const [trackingView, setTrackingView] = useState(null); // 'sold', 'retail', 'distribution', etc.

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
            window.alert("Non-Ethereum browser detected. You should consider trying MetaMask!");
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

            // Load all data in parallel
            const [
                medCount, 
                rmsCount, 
                manCount, 
                disCount, 
                retCount
            ] = await Promise.all([
                contract.methods.medicineCtr().call(),
                contract.methods.rmsCtr().call(),
                contract.methods.manCtr().call(),
                contract.methods.disCtr().call(),
                contract.methods.retCtr().call()
            ]);

            // Load medicine data
            const meds = {};
            const stages = {};
            for (let i = 0; i < medCount; i++) {
                const id = i + 1;
                meds[id] = await contract.methods.MedicineStock(id).call();
                stages[id] = await contract.methods.showStage(id).call();
            }
            setMedicines(meds);
            setMedicineStages(stages);

            // Load role data
            const loadRoleData = async (method, count) => {
                const data = {};
                for (let i = 0; i < count; i++) {
                    data[i + 1] = await method(i + 1).call();
                }
                return data;
            };

            const [rms, man, dis, ret] = await Promise.all([
                loadRoleData(contract.methods.RMS, rmsCount),
                loadRoleData(contract.methods.MAN, manCount),
                loadRoleData(contract.methods.DIS, disCount),
                loadRoleData(contract.methods.RET, retCount)
            ]);

            setSuppliers(rms);
            setManufacturers(man);
            setDistributors(dis);
            setRetailers(ret);

            setIsLoading(false);
        } catch (error) {
            console.error("Error loading blockchain data:", error);
            window.alert(error.message);
            setIsLoading(false);
        }
    };

    const handleTrackMedicine = (id) => {
        if (!medicines[id]) {
            alert("Invalid Component ID!");
            return;
        }

        const stage = medicines[id].stage;
        let view = 'ordered'; // Default for stage 0
        
        if (stage == 5) view = 'sold';
        else if (stage == 4) view = 'retail';
        else if (stage == 3) view = 'distribution';
        else if (stage == 2) view = 'manufacture';
        else if (stage == 1) view = 'rms';

        setSelectedId(id);
        setTrackingView(view);
    };

    const resetTracking = () => {
        setTrackingView(null);
        setSelectedId(null);
    };

    const goHome = () => {
        history.push('/');
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading Component data...</p>
            </div>
        );
    }

    if (trackingView) {
        const medicine = medicines[selectedId];
        const currentStage = medicineStages[selectedId];
        
        const getStageComponent = (stage, title, data) => {
            if (!data) return null;
            
            return (
                <div className={`stage-card ${stage <= medicine.stage ? 'active' : ''}`}>
                    <div className="stage-header">
                        <div className="stage-icon">{stage}</div>
                        <h4>{title}</h4>
                    </div>
                    {data && (
                        <div className="stage-details">
                            <p><strong>ID:</strong> {data.id}</p>
                            <p><strong>Name:</strong> {data.name}</p>
                            <p><strong>Location:</strong> {data.place}</p>
                        </div>
                    )}
                </div>
            );
        };

        const renderTrackingView = () => {
            const supplier = suppliers[medicine.RMSid];
            const manufacturer = manufacturers[medicine.MANid];
            const distributor = distributors[medicine.DISid];
            const retailer = retailers[medicine.RETid];

            return (
                <div className="tracking-container">
                    <div className="medicine-header">
                        <h2>Component Tracking Details</h2>
                        <div className="medicine-info">
                            <h3>{medicine.name}</h3>
                            <p><strong>ID:</strong> {medicine.id}</p>
                            <p><strong>Description:</strong> {medicine.description}</p>
                            <p><strong>Current Stage:</strong> 
                                <span className={`stage-badge stage-${medicine.stage}`}>
                                    {currentStage}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="supply-chain-visualization">
                        {getStageComponent(1, "Raw Material Supplier", supplier)}
                        {medicine.stage >= 1 && <div className="arrow">→</div>}
                        {getStageComponent(2, "Manufacturer", manufacturer)}
                        {medicine.stage >= 2 && <div className="arrow">→</div>}
                        {getStageComponent(3, "Distributor", distributor)}
                        {medicine.stage >= 3 && <div className="arrow">→</div>}
                        {getStageComponent(4, "Retailer", retailer)}
                        {medicine.stage >= 4 && <div className="arrow">→</div>}
                        {getStageComponent(5, "Sold", medicine.stage >= 5 ? {} : null)}
                    </div>

                    {trackingView === 'ordered' && (
                        <div className="qr-section">
                            <h4>Scan to Track This Component</h4>
                            <QRCodeCanvas 
                                value={JSON.stringify({
                                    id: medicine.id,
                                    name: medicine.name,
                                    description: medicine.description,
                                    currentStage: currentStage
                                })} 
                                size={200}
                                level="H"
                            />
                            <p className="qr-note">This QR code contains basic Component information for tracking purposes.</p>
                        </div>
                    )}

                    <div className="action-buttons">
                        <button onClick={resetTracking} className="btn track-another">
                            Track Another Component
                        </button>
                        <button onClick={goHome} className="btn go-home">
                            Back to Home
                        </button>
                    </div>
                </div>
            );
        };

        return renderTrackingView();
    }

    return (
        <div className="track-page-container">
            <div className="page-header">
                <h1>Component Tracking System</h1>
                <div className="account-info">
                    <span>Connected as: {currentAccount}</span>
                    <button onClick={goHome} className="btn home-btn">
                        Back to Home
                    </button>
                </div>
            </div>

            <div className="track-controls">
                <div className="search-section">
                    <h3>Track a Component</h3>
                    <div className="search-form">
                        <input 
                            type="text" 
                            placeholder="Enter Component ID" 
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="search-input"
                        />
                        <button 
                            onClick={() => handleTrackMedicine(selectedId)} 
                            className="btn search-btn"
                        >
                            Track Component
                        </button>
                    </div>
                </div>

                <div className="battery-list">
                    <h3>Available Batteries</h3>
                    <div className="table-responsive">
                        <table className="battery-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Current Stage</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(medicines).map((key) => {
                                    const med = medicines[key];
                                    return (
                                        <tr key={key}>
                                            <td>{med.id}</td>
                                            <td>{med.name}</td>
                                            <td>{med.description}</td>
                                            <td>
                                                <span className={`stage-label stage-${med.stage}`}>
                                                    {medicineStages[key]}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    onClick={() => handleTrackMedicine(key)}
                                                    className="btn track-btn"
                                                >
                                                    Track
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Track;