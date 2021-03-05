import React from "react";
import { Select } from "antd";
import { ENDPOINTS, useConnectionConfig } from "../utils/connection";
import { Slippage } from "./slippage";

export const Settings = () => {
  const { endpoint, setEndpoint } = useConnectionConfig();

  return (
    <>
      <div>
        Transactions: Settings:
        <div>
          Slippage:
          <Slippage />
        </div>
      </div>
      <div style={{ display: "grid" }}>
        Network:{" "}
        <Select
          onSelect={setEndpoint}
          value={endpoint}
          style={{ marginRight: 8 }}
        >
          {ENDPOINTS.map(({ name, endpoint }) => (
            <Select.Option value={endpoint} key={endpoint}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </div>
    </>
  );
};
