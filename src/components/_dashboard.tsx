import React, {useEffect, useCallback, useState} from "react";
import {Table} from 'antd'
import axios from 'axios'

import { AppBar } from "./appBar";

import './dashboard.less'

export const Dashboard = () => {
	const d: Array<{pair: string, price: number}> = []
	const [dataSource, setDataSource] = useState(d)
	const [loading, setLoading] = useState(false)

	const c: Array<{title: string, dataIndex: string, key: string, align: "left" | "center" | "right" | undefined}> = []
	const [columns , setColumns] = useState(c)

	const fetchData = useCallback(async () => {
		setLoading(true)
		const {data: {data}} = await axios({
      url: 'https://api.1sol.io/chart', 
    })

		let tokenPairs: string[] = []
		let exchanges: string[] = []

		let columns: Array<{title: string, dataIndex: string, key: string, align: "left" | "center" | "right" | undefined}> = [{title: 'Token Pair', dataIndex: 'pair', key: 'pair', align: 'left'}]
		let dataSource: Array<{pair: string, price: number}> = []

		data.forEach(({name, token_pair: pair, price}: {name: string, token_pair: string, price: number}) => {
			tokenPairs = [...new Set([...tokenPairs, pair])]
			exchanges = [...new Set([...exchanges, name])]

			dataSource.push({pair, price})
		})

		columns = [...columns, ...exchanges.map((title: string) => {
			const column: {title: string, dataIndex: string, key: string, align: "left" | "center" | "right" | undefined} = { title, dataIndex: 'price', key: title, align: 'left'}

			return column
		})]

		setColumns(columns)
		setDataSource(dataSource)
		setLoading(false)
	}, [])

	useEffect(() => {
		fetchData()

		const timeout = setTimeout(() => fetchData(), 5000)

		return clearTimeout(timeout)
	}, [fetchData])

	return (
		<div className="page-dashboard">
			<AppBar />
			<div className="bd">
				<Table loading={loading} dataSource={dataSource} columns={columns} bordered pagination={false} />
			</div>
		</div>
	)
}