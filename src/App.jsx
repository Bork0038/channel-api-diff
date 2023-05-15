import { useState, useEffect, version } from "react";
import { Loader, Button, CustomProvider, toaster, Message, Input, InputGroup, Divider } from "rsuite";
import { Search } from '@rsuite/icons';
import _ from "lodash";

import "./App.css";
import "rsuite/styles/index.less";

const CHANNEL_LIST = "https://raw.githubusercontent.com/bluepilledgreat/Roblox-DeployHistory-Tracker/main/ChannelsAll.json";

const addedOrRemovedMember = (apiClass, member, removed) => {
	let tags = "";
	if (member.Tags) {
		tags = `[ ${member.Tags.join(", ")} ]`;
	}

	let security = "";
	if (member.Security) {
		const securityType = typeof member.Security;

		if ( securityType != "object" ) {
			if (member.Security != "None") security = `[ ${member.Security} ]`;
		} else {
			const readType = member.Security.Read;
			const writeType = member.Security.Write;

			if (readType == writeType) {
				if (readType != "None") security = `[ ${readType} ]`;
			} else if (readType == "None" ) {
				security = `[ Write: ${writeType} ]`;
			} else if (writeType == "None") {
				security = `[ Read: ${readType} ]`;
			} else {
				security = `[ Read: ${readType}, Write: ${writeType} ]`;
			}
		}
	}

	const memberType = member.MemberType;

	if (memberType == "Property") {
		return <p class="class-member">
				{
					removed 
						? <span class="color-removed">Removed </span>	
						: <span class="color-added">Added </span> 
				}
				<span class="color-type">Property </span> 
				<span class="color-class">{member.ValueType.Name}</span> {member.Name + " "} 
				<span class="color-tags">{tags}</span>
				<span> </span>
				<span class="color-security">{security}</span>
			</p>;
	} else if (memberType == "Function") {
		return <p class="class-member">
				{
					removed 
						? <span class="color-removed">Removed </span>	
						: <span class="color-added">Added </span> 
				}
				<span class="color-type">Function </span> 
				{ serializeFunctionMember( apiClass, member ) }
				<span> </span>
				<span class="color-tags">{tags}</span>
				<span> </span>
				<span class="color-security">{security}</span>
			</p>;
	} else if (memberType == "Event") {
		let paramString = member.Parameters
			.map(param => <>
				<span class="color-class">{param.Type.Name}</span> {param.Name}, </>
			)

		return <p class="class-member">
				{
					removed 
						? <span class="color-removed">Removed </span>	
						: <span class="color-added">Added </span> 
				}
				<span class="color-type">Event </span>{apiClass.Name}.{member.Name}( {paramString} )
				<span class="color-tags">{tags}</span>
				<span> </span>
				<span class="color-security">{security}</span>
			</p>;
	}
}

const serializeFunctionMember = ( apiClass, member ) => {
	let paramString = member.Parameters
		.map(param => <>
			<span class="color-class">{param.Type.Name}</span> {param.Name}, </>
		)

	return <>
			<span class="color-class">{member.ReturnType.Name} </span> 
			{" " + apiClass.Name}:{member.Name}( {paramString} )
	</>
};

const serializeSecurity = (obj) => {
	let security = "";
	if (obj.Security) {
		const securityType = typeof obj.Security;

		if ( securityType != "object" ) {
			if (apiClass.Security != "None") security = `[ ${obj.Security} ]`;
		} else {
			const readType = obj.Security.Read;
			const writeType = obj.Security.Write;

			if (readType == writeType) {
				if (readType != "None") security = `[ ${readType} ]`;
			} else if (readType == "None" ) {
				security = `[ Write: ${writeType} ]`;
			} else if (writeType == "None") {
				security = `[ Read: ${readType} ]`;
			} else {
				security = `[ Read: ${readType}, Write: ${writeType} ]`;
			}
		}
	}

	return security;
}

const serializeTags = (obj) => {
	let tags = "";
	if (obj.Tags) {
		tags = `[ ${
			obj.Tags.map(s => 
				typeof s == "string" 
					? s 
					: JSON.stringify( s )
			).join(", ")
		} ]`
	}

	return tags;
}


const AddedClass = (apiClass) => {
	if (apiClass.Name.endsWith("ImportData")) {
		return <></>;
	}

	const tags = serializeTags( apiClass );
	const security = serializeSecurity( apiClass );

	const addedMembers = [];
	for (let member of apiClass.Members) {
		addedMembers.push( addedOrRemovedMember( apiClass, member ) )
	}
	return <div class="class-change">
	<p>
		<span class="color-added">Added </span> 
		<span class="color-type">Class </span>
		<span class="color-class">{apiClass.Name} </span>
		<span class="color-tags">{tags}</span>
		<span> </span>
		<span class="color-security">{security}</span>
	</p>
	{ addedMembers }
</div>;
}


const RemovedClass = (apiClass) => {
	const tags = serializeTags( apiClass );
	const security = serializeSecurity( apiClass );

	const addedMembers = [];
	for (let member of apiClass.Members) {
		addedMembers.push( addedOrRemovedMember( apiClass, member, true ) )
	}
	return <div class="class-change">
	<p>
		<span class="color-removed">Removed </span> 
		<span class="color-type">Class </span>
		<span class="color-class">{apiClass.Name} </span>
		<span class="color-tags">{tags}</span>
		<span> </span>
		<span class="color-security">{security}</span>
	</p>
	{ addedMembers }
	</div>
}


function ClassChange(apiClass, baseClass) {
	const tags = serializeTags( apiClass );
	const security = serializeSecurity( apiClass );

	const addedMembers = [];
	const removedMembers = [];
	const changedMembers = [];

	const apiMemberMap = {};
	const baseMemberMap = {};

	for (let apiMember of apiClass.Members) {
		apiMemberMap[ apiMember.Name ] = apiMember;
	}

	for (let apiMember of baseClass.Members) {
		baseMemberMap[ apiMember.Name ] = apiMember;
	}

	const nonObjectMemberChanged = ( key, member, baseMember) => {
		if (member.MemberType == "Property") {
			changedMembers.push(
				<div class="class-member">
					<span class="color-change">Changed </span>
					the <span class="color-class">{key}</span> of 
					<span class="color-type"> Property </span> 

					{ apiClass.Name }.{member.Name} 
					<p class="class-sub-member">
						<b>from: </b>
						<span class="color-class"> {baseMember[key]}</span>
						<br></br>
						<b>to: </b>
						<span class="color-class"> {member[key]}</span>
					</p>
				</div>
			)
		} else if (member.MemberType == "Function") {
			changedMembers.push(
				<div class="class-member">
					<span class="color-change">Changed </span>
					the <span class="color-class">{key}</span> of 
					<span class="color-type"> Function </span> 
					{" " + apiClass.Name}:{member.Name}
					<p class="class-sub-member">
						<b>from: </b>
						<span class="color-class"> {baseMember[key]}</span>
						<br></br>
						<b>to: </b>
						<span class="color-class"> {member[key]}</span>
					</p>
				</div>
			);
		} else if (member.memberType == "Event") {
			changedMembers.push(
				<div class="class-member">
					<span class="color-change">Changed </span>
					the <span class="color-class">{key}</span> of 
					<span class="color-type"> Event </span> 
					{" " + apiClass.Name}:{member.Name}
					<p class="class-sub-member">
						<b>from: </b>
						<span class="color-class"> {baseMember[key]}</span>
						<br></br>
						<b>to: </b>
						<span class="color-class"> {member[key]}</span>
					</p>
				</div>
			);
		}
	}

	const objectMemberChanged = (key, member, baseMember) => {
		const memberType = member.MemberType;
		const serializedName = memberType == "Property" || memberType == "Event" 
			? ` ${apiClass.Name}.${member.Name}`
			: ` ${apiClass.Name}:${member.Name}`


		switch (key) {
			case "ReturnType":
				return changedMembers.push(
					<div class="class-member">
						<span class="color-change">Changed </span>
						the <span class="color-class">{key}</span> of 
						<span class="color-type"> Function </span> 
						{" " + apiClass.Name}:{member.Name}
						<p class="class-sub-member">
							<b>from: </b>
							<span class="color-class"> {baseMember[key].Name}</span>
							<br></br>
							<b>to: </b>
							<span class="color-class"> {member[key].Name}</span>
						</p>
					</div>
				);
			case "Tags":

				let memberTags = member.Tags
					? `[ ${
						member.Tags.map(s => 
							typeof s == "string" 
								? s 
								: JSON.stringify( s )
						).join(", ")
					} ]`
					: "None";

				let baseTags = baseMember.Tags
					? `[ ${
						baseMember.Tags.map(s => 
							typeof s == "string" 
								? s 
								: JSON.stringify( s )
						).join(", ")
					} ]`
					: "None"


				return changedMembers.push(
					<div class="class-member">
						<span class="color-change">Changed </span>
						the <span class="color-class">{key}</span> of 
						<span class="color-type"> {member.MemberType} </span> 
						{serializedName}
						<p class="class-sub-member">
							<b>from: </b>
							<span class="color-tags">{baseTags}</span>
							<br></br>
							<b>to: </b>
							<span class="color-tags">{memberTags}</span>
						</p>
					</div>
				);

			case "Serialization":
				const baseSerialization = `[ CanLoad: ${baseMember.Serialization.CanLoad}, CanSave: ${baseMember.Serialization.CanSave} ]`;
				const memberSerialization = `[ CanLoad: ${member.Serialization.CanLoad}, CanSave: ${member.Serialization.CanSave} ]`;
				
				return changedMembers.push(
					<div class="class-member">
						<span class="color-change">Changed </span>
						the <span class="color-class">{key}</span> of 
						<span class="color-type"> {member.MemberType} </span> 
						{serializedName}
						<p class="class-sub-member">
							<b>from: </b>
							<span class="color-serialization">{baseSerialization}</span>
							<br></br>
							<b>to: </b>
							<span class="color-serialization">{memberSerialization}</span>
						</p>
					</div>
				);

			default:
				console.log(member);
				console.log(key);

		}
	}

	if (!_.isEqual(apiClass.Members, baseClass.Members)) {
		for (let member of apiClass.Members) {
			const baseMember = baseMemberMap[ member.Name ] ;

			if (!_.isEqual(member, baseMember)) {
				if (baseMember) {
					for (let key of Object.keys( member )) {
						const memberValue = member[ key ];
						const memberValueType = typeof memberValue;
	
						if (key != "Default") {
							const baseMemberValue = baseMember[ key ]

							if (!_.isEqual(memberValue, baseMemberValue)) {
								if (memberValueType != "object") {
									nonObjectMemberChanged( key, member, baseMember );
								} else {
									objectMemberChanged( key, member, baseMember );
								}
							}
						}
					}
				} else {
					addedMembers.push( addedOrRemovedMember( apiClass, member ) );
				}
			}
		}

		for (let baseMember of baseClass.Members) {
			if (!apiMemberMap[ baseMember.Name ]) {
				removedMembers.push( addedOrRemovedMember( apiClass, baseMember, true ) )
			}
		}
	}

	return <div class="class-change">
		<p>
			<span class="color-change">Changed </span> 
			<span class="color-type">Class </span>
			<span class="color-class">{apiClass.Name} </span>
			<span class="color-tags">{tags}</span>
			<span> </span>
			<span class="color-security">{security}</span>
		</p>
		{ addedMembers }
		{ changedMembers }
		{ removedMembers }
	</div>;
}

function App() {
	const [ channels, setChannels ] = useState([]);
	const [ searchTerm, setSearchTerm ] = useState("");

	const [ loaderHidden, setLoaderHidden ] = useState(false);
	const [ loaderMessage, setLoaderMessage ] = useState("Loading Channels...");
	const [ renderedDiff, setRenderedDiff ] = useState([]);

	let mainDeployHistory = {};

	// stolen from mozilla website
	async function hash(message) {
		const msgUint8 = new TextEncoder().encode(message);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
		  	.map((b) => b.toString(16).padStart(2, "0"))
		  	.join(""); 

		return hashHex;
	}
	  
	const throwError = message => {
		setLoaderHidden( true );

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
					const text = await res.text();

					return { 
						deployHistory: text, 
						deployType: deployType == "/DeployHistory.txt" ? "win" : "mac" 
					};
				}
			} catch(e) {}
		}
	
		return { deployHistory: null, deployType: null };
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

	const API_TYPE_LIST = [ "-Full-API-Dump.json", "-API-DUMP.json" ];
	const loadAPI = async (channel, version, versionType) => {
		setLoaderMessage( "Loading API" );
	
		for (let apiType of API_TYPE_LIST) {
			try {
				const res = await fetch(`https://setup.rbxcdn.com/channel/${channel}${versionType == "Studio" ? "/mac" : ""}/${version}${apiType}`);
				if (res.status == 200) {
					return { 
						api: await res.json(), 
						apiType 
					};
				}
			} catch(e) {}
		}
	
		return { api: null, apiType: null };
	};

	const loadMainDeployHistory = async (deployType) => {
		const res = await fetch(`https://setup.rbxcdn.com/${deployType == "mac" ? "mac/" : ""}DeployHistory.txt`);
	
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
			}

			gap++;
		}
	}

	const loadAPIFromMain = async (version, apiType) => {
		setLoaderMessage( "Loading matching API" );

		const res = await fetch(`https://setup.rbxcdn.com/${version}${apiType}`);
		if (res.status == 200) {
			return await res.json();
		}
	
		return null;
	}

	const loadDiff = async channel => {
		setLoaderHidden( false );
		setRenderedDiff( [] );
		channel = channel.toLowerCase();

		const { deployHistory, deployType } = await loadDeployHistory( channel );
		if (!deployHistory) return throwError("Failed to load deploy history");

		const lines = deployHistory.split('\n').filter( s => s != "\r" && s != "" && s.match("New Studio") );
		if (lines.length == 0) {
			return throwError("Failed to find studio deploy");
		}

		const latest = lines[ lines.length - 1 ];

		const versionType = latest.match(/New (.+) version-/i)[1];
		const versionDateString = latest.match(/\d+\/\d+\/\d+/i)[0];

		const latestVersion = await getVersionOfType( channel, versionType );
		if (!latestVersion) return throwError("Failed to load latest version");

		const { api, apiType } = await loadAPI( channel, latestVersion, versionType );
		if (!api) return throwError("Failed to load API dump");

		if (!mainDeployHistory[ deployType ]) {
			mainDeployHistory[ deployType ] = await loadMainDeployHistory( deployType );
		}

		const mainHistory = mainDeployHistory[ deployType ];

		const matchingVersionData = await getVersionAtDate( mainHistory, versionDateString );
    	const matchingVersion = matchingVersionData.match(/version-\w{16}/i)[0];

		const matchingAPI = await loadAPIFromMain( matchingVersion, apiType );
		if (!matchingAPI) return throwError("Failed to load matching API");

		// start actual diffing
		const liveClassHashTable = {};
		const channelClassHashTable = {};

		for (let apiClass of matchingAPI.Classes) {
			liveClassHashTable[ apiClass.Name ] = JSON.stringify( apiClass );
		}

		for (let apiClass of api.Classes) {
			channelClassHashTable[ apiClass.Name ] = JSON.stringify( apiClass );
		}

		const changed = [];
		const removed = [];
		const added   = [];

		for (let apiClass of api.Classes) {
			if (!liveClassHashTable[ apiClass.Name ]) {
				added.push( apiClass );
			} else {
				const baseClass = matchingAPI.Classes.filter(s => s.Name == apiClass.Name)[0];

				if (!_.isEqual(apiClass, baseClass)) {
					changed.push( apiClass );
				}
			}
		}

		for (let apiClass of matchingAPI.Classes) {
			if (!channelClassHashTable[ apiClass.Name ]) {
				removed.push( apiClass );
			}
		}

		const diff = [];
		for (let apiClass of added) {
			diff.push(
				AddedClass( apiClass )
			);
		}

		for (let apiClass of changed) {
			const original = matchingAPI.Classes.filter(s => s.Name == apiClass.Name)[0];

			diff.push(
				ClassChange( apiClass, original )
			);
		}

		for (let apiClass of removed) {
			diff.push(
				RemovedClass( apiClass )
			);
		}

		setRenderedDiff( diff );
		setLoaderHidden( true );
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

		<div id="diff">
			{ renderedDiff }
		</div>
	</CustomProvider>
}

export default App;