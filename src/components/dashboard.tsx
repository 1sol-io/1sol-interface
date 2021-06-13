import React, {useEffect, useState} from "react";
import {Table} from 'antd'

import { AppBar } from "./appBar";

import './dashboard.less'

export const Dashboard = () => {
	const [dataSource, setDataSource] = useState([])
	const [columns, setColumns] = useState([])

	return (
		<div className="page-dashboard">
			<AppBar />
			<div className="bd">
				<Table dataSource={dataSource} columns={columns} />;
			</div>
		</div>
	)
}