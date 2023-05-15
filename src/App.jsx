import { useState, useEffect, version } from "react";
import { Loader, Button, CustomProvider, toaster, Message, Input, InputGroup, Divider } from "rsuite";
import { Search } from '@rsuite/icons';

import "./App.css";
import "rsuite/styles/index.less";

const CHANNEL_LIST = "https://raw.githubusercontent.com/bluepilledgreat/Roblox-DeployHistory-Tracker/main/ChannelsAll.json";

function App() {
	const [ channels, setChannels ] = useState([]);
	const [ searchTerm, setSearchTerm ] = useState("");

	const [ loaderHidden, setLoaderHidden ] = useState(false);
	const [ loaderMessage, setLoaderMessage ] = useState("Loading Channels...");
	const [ mainDeployHistory, setMainDeployHistory ] = useState();

	const throwError = message => {
		return toaster.push(
			<Message showIcon type="error">{message}</Message>
		);
	}

	const DEPLOY_TYPES = [ "/DeployHistory.txt", "/mac/DeployHistory.txt" ];
	const loadDeployHistory = async channel => {
		setLoaderMessage( "Loading Deploy History" );

		for (let deployType of DEPLOY_TYPES) {
			try {
				let res = await fetch(`https://setup.rbxcdn.com/channel/${channel}${deployType}`);
				if (res.status == 200) {
					return await res.text();
				}
			} catch(e) {}
		}

		return null;
	};

	const VERSION_TYPE_MAP = {
		"Studio64": "/versionQTStudio",
		"Studio": "/mac/versionStudio",
	};
	const getVersionOfType = async ( channel, versionType ) => {
		setLoaderMessage( "Loading Latest Version" );

		const versionTypeUrl = VERSION_TYPE_MAP[ versionType ];

		const res = await fetch(`https://setup.rbxcdn.com/channel/${channel}${versionTypeUrl}`);
		if (res.status == 200) {
			return await res.text();
		}

		return null;
	};

	const loadAPI = async (channel, version, versionType) => {
		setLoaderMessage( "Loading API" );

		const res = await fetch(`https://setup.rbxcdn.com/channel/${channel}${versionType == "Studio" ? "/mac" : ""}/${version}-Full-API-Dump.json`);
		if (res.status == 200) {
			return await res.json();
		}

		return null;
	};

	const loadMainDeployHistory = async () => {
		const res = await fetch("https://setup.rbxcdn.com/DeployHistory.txt");

		return (await res
			.text())
			.split('\n')
			.filter( s => s != "\r" && s != "" && s.match("New Studio") );
	}

	const getVersionAtDate = (versions, date) => {
		setLoaderMessage( "Finding matching API dump" );

		const res = versions.filter( s => s.includes( date ) );
		if (res.length != 0) {
			return res[ 0 ];
		}

		let gap = 0;
		while (true) {
			let previousDate = new Date( date );
			previousDate.setDate( previousDate.getDate() - gap );

			let nextDate = new Date( date );
			nextDate.setDate( nextDate.getDate() + gap );

			let previousDateString = `${previousDate.getMonth()}/${previousDate.getDate()}/${previousDate.getFullYear()}`;
			let nextDateString = `${nextDate.getMonth()}/${nextDate.getDate()}/${nextDate.getFullYear()}`;

			const res = versions.filter( s => s.includes( nextDateString ) || s.includes( previousDateString ) );
			if (res.length != 0) {
				return res[0];
				break;
			}

			gap++;
		}
	}

	const loadDiff = async channel => {
		setLoaderHidden( false );
		channel = channel.toLowerCase();

		const deployHistory = await loadDeployHistory( channel );
		if (!deployHistory) {
			setLoaderHidden( true );

			return throwError("Failed to load deploy history");
		}

		
		const lines = deployHistory.split('\n').filter( s => s != "\r" && s != "" && s.match("New Studio") );
		if (lines.length == 0) {
			return throwError("Failed to find studio deploy");
		}

		const latest = lines[ lines.length - 1 ];

		const versionType = latest.match(/New (.+) version-/i)[1];
		const versionDateString = latest.match(/\d+\/\d+\/\d+/i)[0];

		const latestVersion = await getVersionOfType( channel, versionType );
		if (!latestVersion) {
			setLoaderHidden( true );

			return throwError("Failed to load latest version");
		}

		const api = await loadAPI( channel, latestVersion, versionType );
		if (!api) {
			setLoaderHidden( true );

			return throwError("Failed to load API dump");
		}

		let mainHistory;
		if (!mainDeployHistory) {
			mainHistory = await loadMainDeployHistory();
			setMainDeployHistory( mainHistory );
		}

		// find api dump from around same time
		const versionDate = await getVersionAtDate( mainHistory, versionDateString );
		console.log(versionDate);
		
	}

	const loadChannels = async () => {
		const res = await fetch( CHANNEL_LIST );
		const data = await res.json();

		setChannels( data );
		setLoaderHidden( true );
	}

	const getChannels = () => {
		let channelList = channels;
		if (searchTerm != "") {
			channelList = channelList.filter( s => s.toLowerCase().match(searchTerm.toLowerCase()) );
		}

		return channelList;
	}

	const search = () => {
		let value = document.getElementById("search-input").value;

		setSearchTerm( value );
	}

	useEffect( () => {
		loadChannels();
	}, [] )

	return <CustomProvider id="wrapper" theme="dark">
		<div id="loading-screen" hidden={loaderHidden}>
			<div id="loading-screen-inner">
				<p>{ loaderMessage }</p>
				<Loader center size="lg" id="loading-screen-loader" />
			</div>
		</div>	

		<div id="sidebar">
			<div id="sidebar-header">Channel API Diff</div>
			<Divider />
			<p class="sidebar-panel">Search</p>
			<InputGroup id="search">
				<Input id="search-input" onChange={search} />
				<InputGroup.Button onClick={search}>
					<Search />
				</InputGroup.Button>
			</InputGroup>
			<p class="sidebar-panel">Channels</p>
			<div id="sidebar-channels">
			{
				getChannels().map( channel => {
					return <Button class="sidebar-button" onClick={() => loadDiff( channel )}><p>{channel}</p></Button>
				})
			}
			</div>
		</div>
	</CustomProvider>
}

export default App;