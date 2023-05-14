import { useState, useEffect } from "react";
import { Loader, Button, CustomProvider, Sidenav, Nav, Input, InputGroup, Divider } from "rsuite";
import { Search } from '@rsuite/icons';

import "./App.css";
import "rsuite/styles/index.less";

const CHANNEL_LIST = "https://raw.githubusercontent.com/bluepilledgreat/Roblox-DeployHistory-Tracker/main/ChannelsAll.json";
function App() {
	const [ channels, setChannels ] = useState([]);
	const [ searchTerm, setSearchTerm ] = useState("");

	const [ loaderHidden, setLoaderHidden ] = useState(false);
	const [ loaderMessage, setLoaderMessage ] = useState("Loading Channels...");

	const VERSION_TYPES = [
		"/version",
		"/versionQTStudio",
		"/mac/versionStudio",
		"/mac/version"
	];
	const getVersion = async channel => {
		channel = channel.toLowerCase();
		let version = null;

		for (let version of VERSION_TYPES ){
			try {
				version = await fetch(
					`http://setup.rbxcdn.com/channel/${channel}${version}`,
					 { 
						headers: {
							Origin: "http://roblox.com"
						}
					}
				);
				break;
			} catch(e) {};
		}

		return version;
	}

	const loadAPI = async channel => {
		setLoaderMessage( "Loading API for " + channel );
		setLoaderHidden( false );
	};

	const loadDiff = async channel => {
		const latestVersion = await getVersion(channel	);

		const api = await loadAPI( channel );

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