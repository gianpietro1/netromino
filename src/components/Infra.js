import React from "react";
import { Table } from "semantic-ui-react";

const Infra = ({
  servers,
  ports,
  portsSwitch,
  freeServers,
  externalStorage,
  vnfs
}) => {
  const netServers =
    servers.length - freeServers > 0 ? servers.length - freeServers : 0;
  const netPorts = ports * netServers;
  return (
    <Table celled striped fixed>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell className="thinfo titles thblack" colSpan="5">
            Infrastructure required
          </Table.HeaderCell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell className="thinfo titles thblack" colSpan="1">
            Servers
          </Table.HeaderCell>
          <Table.HeaderCell className="thinfo titles thblack" colSpan="1">
            Switch ports
          </Table.HeaderCell>
          <Table.HeaderCell className="thinfo titles thblack" colSpan="1">
            Switches
          </Table.HeaderCell>
          <Table.HeaderCell className="thinfo titles thblack" colSpan="1">
            External Storage (TB)
          </Table.HeaderCell>
          <Table.HeaderCell className="thinfo titles thblack" colSpan="1">
            VNF Count
          </Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell className="thinfo tdstrong">{netServers}</Table.Cell>
          <Table.Cell className="thinfo tdstrong">{netPorts}</Table.Cell>
          <Table.Cell className="thinfo tdstrong">
            {Math.ceil(netPorts / portsSwitch)}
          </Table.Cell>
          <Table.Cell className="thinfo tdstrong">
            {(externalStorage / 1000).toFixed(2)}
          </Table.Cell>
          <Table.Cell className="thinfo tdstrong">{vnfs}</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
};

export default Infra;
