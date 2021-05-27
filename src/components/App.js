import React, { useState } from "react";
import {
  Form,
  Popup,
  Label,
  Input,
  Checkbox,
  Button,
  Table
} from "semantic-ui-react";
import "../assets/styles/table.css";
import { colorArray } from "../assets/styles/colors";
import CSVReaderComponent from "./CSVReaderComponent";
import Infra from "./Infra";

const MAXCPU = 256;

const App = () => {
  const [numaNodes, setNumaNodes] = useState(2);
  const [cputop, setCputop] = useState(22);
  const [sriovbw, setSriovbw] = useState(25);
  const [rescpu, setRescpu] = useState(2);
  const [mem, setMem] = useState(1000);
  const [disk, setDisk] = useState(5000);
  const [ports, setPorts] = useState(8);
  const [portsSwitch, setPortsSwitch] = useState(48);
  const [freeServers, setFreeServers] = useState(0);
  const [HT, setHT] = useState(true);
  const [servers, setServers] = useState([]);
  const [externalStorage, setExternalStorage] = useState(0);
  const [cputopNew, setCputopNew] = useState(44);
  const [error, setError] = useState("");
  const [VNFS, setVNFS] = useState([]);
  const [VNFcount, setVNFcount] = useState([]);

  const handleUploadFile = data => {
    setVNFS(data);
  };

  const vnfCountArray = [];

  const placement = (
    vnfs,
    numaNodesInput,
    perNUMAVCPUinput,
    sriovbwInput,
    memInput,
    diskInput
  ) => {
    setError("");
    setServers([]);
    const calculatedServers = [];
    let calculatedExternalDisk = 0;
    const colors = colorArray
      .sort(() => 0.5 - Math.random())
      .slice(0, vnfs.length);
    vnfs.forEach((vnfData, index) => {
      const vnf = vnfData.data;
      // Build array for counting unique VNFs
      if (vnf.vnf && !vnfCountArray.includes(vnf.vnf)) {
        vnfCountArray.push(vnf.vnf);
      }
      const vmCPU = parseInt(vnf.cpus);
      const vmSRIOVBW = parseInt(vnf.sriov_throughput_vm);
      const vmMem = parseInt(vnf.ram);
      const vmDisk = vnf.local_disk ? parseInt(vnf.local_disk) : 0;
      // for each VM in VNF
      for (let i = 1; i < parseInt(vnf.number) + 1; i++) {
        // build VM object
        const vmObject = {
          id: vnf.id,
          name: vnf.vnf + "-" + vnf.name + "-" + i,
          color: colors[index]
        };
        let foundServer = false;
        let foundNuma = false;
        // try to place it in an existing server
        if (calculatedServers.length) {
          for (let j = 0; j < calculatedServers.length; j++) {
            if (!calculatedServers[j].affinityList.includes(vnf.affinity)) {
              // Affinity not on this server, try placement in each NUMA node
              for (let k = 0; k < calculatedServers[j].numaArray.length; k++) {
                if (
                  vmCPU <= calculatedServers[j].numaArray[k].cpusLeft &&
                  vmMem <= calculatedServers[j].memLeft &&
                  vmDisk <= calculatedServers[j].diskLeft &&
                  (vmSRIOVBW <= calculatedServers[j].numaArray[k].sriovbwLeft ||
                    !vmSRIOVBW)
                ) {
                  // Computing available, place it!
                  calculatedServers[j].numaArray[k].cpus = calculatedServers[
                    j
                  ].numaArray[k].cpus.concat(Array(vmCPU).fill(vmObject));
                  // Mark server with affinity group
                  if (vnf.affinity) {
                    calculatedServers[j].affinityList.push(vnf.affinity);
                  }
                  // Update CPUs left
                  calculatedServers[j].numaArray[k].cpusLeft -= vmCPU;
                  // Update SRIOV BW left
                  if (vmSRIOVBW) {
                    calculatedServers[j].numaArray[k].sriovbwLeft -= vmSRIOVBW;
                  }
                  // Update Mem left
                  calculatedServers[j].memLeft -= vmMem;
                  // Update Disk left
                  calculatedServers[j].diskLeft -= vmDisk;
                  // Add to external disk
                  if (vnf.external_disk) {
                    calculatedExternalDisk += parseFloat(vnf.external_disk);
                  }
                  // Found NUMA for this VM!
                  foundNuma = true;
                  // Break NUMA loop
                  break;
                }
              }
              // end of NUMA loop
            }
            if (foundNuma === true) {
              // Found server for this VM!
              foundServer = true;
              // Break server loop
              break;
            }
          }
          // end of existing servers loop
        }
        // if no existing server-numa found, place it in a new server
        if (!calculatedServers.length || !foundServer) {
          // build numa node objects
          let numaArray = [];
          for (let i = 0; i < numaNodesInput; i++) {
            numaArray[i] = {
              cpus: [],
              cpusLeft: perNUMAVCPUinput,
              sriovbwLeft: parseInt(sriovbwInput)
            };
          }
          // add VM in first NUMA node of this new server
          numaArray[0].cpus = Array(vmCPU).fill(vmObject);
          numaArray[0].cpusLeft = perNUMAVCPUinput - vmCPU;
          if (vmSRIOVBW) {
            if (vmSRIOVBW > numaArray[0].sriovbwLeft) {
              setError(
                "Not enough SR-IOV Bandwidth available, could not complete mapping."
              );
              setServers([]);
              return;
            }
            numaArray[0].sriovbwLeft = parseInt(sriovbwInput) - vmSRIOVBW;
          }
          // add NUMA with VM to new server
          calculatedServers.push({
            affinityList: vnf.affinity ? [vnf.affinity] : [],
            numaArray,
            memLeft: memInput - vmMem,
            diskLeft: diskInput - vmDisk
          });
          // Add to external disk
          if (vnf.external_disk) {
            calculatedExternalDisk += parseFloat(vnf.external_disk);
          }
        }
        // end of VM loop
      }
      // end of VNF loop
    });
    // Fill up unused CPUs in all NUMA nodes
    calculatedServers.forEach(server => {
      server.numaArray.forEach(numaNode => {
        // numaNode.cpus = numaNode.cpus.concat(Array(2).fill("R"));
        numaNode.cpus = numaNode.cpus.concat(Array(numaNode.cpusLeft).fill(""));
      });
    });
    setCputopNew(perNUMAVCPUinput);
    setServers(calculatedServers);
    setExternalStorage(calculatedExternalDisk);
    setVNFcount(vnfCountArray.length);
    // console.log(calculatedServers);
    return {
      servers: calculatedServers,
      externalStorage: calculatedExternalDisk
    };
  };

  const calculate = vnfsInput => {
    if (!VNFS.length) {
      setError("No VNFs to process.");
      return;
    }
    if (cputop > MAXCPU) {
      setError(`Too much CPUs, reducing to ${MAXCPU}.`);
      setCputop(MAXCPU);
      return;
    }
    try {
      // Calculate placement!
      const perNUMAVCPU = (cputop - rescpu) * (HT ? 2 : 1);
      return placement(vnfsInput, numaNodes, perNUMAVCPU, sriovbw, mem, disk);
    } catch (e) {
      setError("Not enough CPUs.");
      console.log(e);
    }
  };

  const renderInputs = () => {
    return (
      <div>
        <CSVReaderComponent uploadFile={handleUploadFile} />
        <Form style={{ marginTop: "1rem" }}>
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            NUMA Nodes
          </Label>
          <Input
            list="numaNodes"
            placeholder="Nodos"
            style={{ width: "5rem", margin: "5px 0" }}
            value={numaNodes}
            onChange={e => setNumaNodes(e.target.value)}
          />
          <datalist id="numaNodes">
            <option value="1">1 node</option>
            <option value="2">2 nodes</option>
            <option value="4">4 nodes</option>
          </datalist>
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            CPUs/node
          </Label>
          <Input
            list="pCPUs"
            placeholder="pCPUs"
            style={{ width: "5rem", margin: "5px 0" }}
            value={cputop}
            onChange={e => setCputop(e.target.value)}
          />
          <datalist id="pCPUs">
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="22">22</option>
            <option value="24">24</option>
            <option value="26">26</option>
            <option value="32">32</option>
            <option value="64">64</option>
          </datalist>
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            Reserved CPUs/node
          </Label>
          <Input
            list="pCPUsreserved"
            placeholder="reservados"
            style={{ width: "5rem", margin: "5px 0" }}
            value={rescpu}
            onChange={e => setRescpu(e.target.value)}
          />
          <datalist id="pCPUsreserved">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="4">4</option>
          </datalist>
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            HT
          </Label>
          <Checkbox toggle checked={HT} onChange={() => setHT(!HT)} />
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            Memory(GB)
          </Label>
          <Input
            style={{ width: "5rem", margin: "5px 0" }}
            value={mem}
            onChange={e => setMem(e.target.value)}
          />
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            Disk(GB)
          </Label>
          <Input
            style={{ width: "5rem", margin: "5px 0" }}
            value={disk}
            onChange={e => setDisk(e.target.value)}
          />
          <br />
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            SR-IOV/node(Gbps)
          </Label>
          <Input
            style={{ width: "5rem", margin: "5px 0" }}
            value={sriovbw}
            onChange={e => setSriovbw(e.target.value)}
          />
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            NICs/server
          </Label>
          <Input
            style={{ width: "4rem", margin: "5px 0" }}
            value={ports}
            onChange={e => setPorts(e.target.value)}
          />
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            Ports/switch
          </Label>
          <Input
            style={{ width: "4rem", margin: "5px 0" }}
            value={portsSwitch}
            onChange={e => setPortsSwitch(e.target.value)}
          />
          <Label
            basic
            size={"large"}
            style={{ borderWidth: 0, padding: "0 0.5rem" }}
          >
            Free cabled servers
          </Label>
          <Input
            style={{ width: "4rem", margin: "5px 0" }}
            value={freeServers}
            onChange={e => setFreeServers(e.target.value)}
          />
          <Button
            style={{ width: "100px", margin: "0 1rem" }}
            positive
            content="Calculate"
            onKeyPress={e => {
              if (e.keyCode === 13) {
                calculate(VNFS);
              }
            }}
            onClick={() => {
              calculate(VNFS);
            }}
          />
        </Form>
      </div>
    );
  };

  const renderTableRow = (server, index) => {
    return (
      <Table.Row>
        <Table.Cell className="thinfo">server-{index + 1}</Table.Cell>
        <Popup
          content={server.affinityList.join(",")}
          key={server.affinityList}
          trigger={
            <Table.Cell className="thinfo">
              {server.affinityList.join(",")}
            </Table.Cell>
          }
        />

        {server.numaArray.map(numaNode => {
          return (
            <>
              {numaNode.cpus.map((cpu, index) => {
                return cpu ? (
                  <Popup
                    content={cpu.name}
                    key={index + cpu.name}
                    trigger={
                      <Table.Cell
                        className="thdata"
                        style={{ backgroundColor: cpu.color }}
                      >
                        {cpu.id}
                      </Table.Cell>
                    }
                  />
                ) : (
                  <Table.Cell className="thdata">-</Table.Cell>
                );
              })}
              <Table.Cell className="thdata" style={{ fontSize: "0.9rem" }}>
                {numaNode.sriovbwLeft}
              </Table.Cell>
            </>
          );
        })}
        <Table.Cell className="thdata" style={{ fontSize: "0.9rem" }}>
          {server.memLeft}
        </Table.Cell>
        <Table.Cell className="thdata" style={{ fontSize: "0.9rem" }}>
          {server.diskLeft}
        </Table.Cell>
      </Table.Row>
    );
  };

  return (
    <div
      className="ui mainTable"
      style={{ width: "98%", margin: "auto", paddingBottom: "5rem" }}
    >
      <h1 style={{ marginTop: "1em" }}>
        <span style={{ color: "#1e90ff" }}>NET</span>ROMINÓ
      </h1>
      {renderInputs()}
      {error ? (
        <Label style={{ marginTop: "1rem" }} color={"red"}>
          {error}
        </Label>
      ) : null}
      {servers.length ? (
        <Infra
          servers={servers}
          ports={ports}
          portsSwitch={portsSwitch}
          externalStorage={externalStorage}
          freeServers={freeServers}
          vnfs={VNFcount}
        />
      ) : null}
      <Table celled striped fixed>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="thinfo titles thblack" colSpan="1">
              Servers ({servers.length})
            </Table.HeaderCell>
            <Table.HeaderCell className="thinfo titles thblack" colSpan="1">
              Anti-Affinity
            </Table.HeaderCell>
            {servers.length ? (
              <>
                {servers[0].numaArray.map((node, index) => {
                  return (
                    <>
                      <Table.HeaderCell
                        className="titles thblack"
                        colSpan={cputopNew}
                      >
                        NUMA Nodes {index} ({cputopNew})
                      </Table.HeaderCell>
                      <Table.HeaderCell className="titles thblack thinner">
                        SR-IOV BW Left
                      </Table.HeaderCell>
                    </>
                  );
                })}
                <Table.HeaderCell className="titles thblack thinner">
                  RAM Left (GB)
                </Table.HeaderCell>
                <Table.HeaderCell className="titles thblack thinner">
                  Disk Left (GB)
                </Table.HeaderCell>
              </>
            ) : (
              <Table.HeaderCell className="titles thblack" colSpan={cputopNew}>
                NUMA Nodes
              </Table.HeaderCell>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {servers.map((server, index) => {
            return renderTableRow(server, index);
          })}
        </Table.Body>
      </Table>
    </div>
  );
};

export default App;
