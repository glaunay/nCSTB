// last modif at 16 dec 2016 01:18
// last modif at 17 Jul 2019 01:18
socket.on("resultsAllGenomes", function(data) {
    console.log("Showing All Genomes results");
    console.dir(data);
    treatResults(data, false);
});

socket.on("submitted", function(data) {
    console.log("Submitted");
    console.dir(data);
});


socket.on("resultsSpecific", function(data) {
    console.log("Showing Specific results");
    console.dir(data);
    treatResults(data, true);
});

// *********************************************
//              *  TREE FEATURES *
// *********************************************
function displayTree(suffix, searchType, treeType){
	var to = false;
	$(searchType+suffix).keyup(function () {
		if(to) { clearTimeout(to); }
		to = setTimeout(function () {
			var v = $(searchType+suffix).val();
			$(treeType+suffix).jstree().search(v);
		}, 250);
	});
	$.jstree.defaults.search.show_only_matches=true;
	// tree building

	$(treeType+suffix).jstree({
		"core" : {
			'data' : { "url" : "./jsontree.json", "dataType" : "json"},
			'themes' : [
				{"dots" : true}
			],
			'animation' : false
		},
		"checkbox" : {
			"keep_selected_style" : false
		},
		"plugins" : [ "wholerow" , "checkbox" , "search" , "dnd" , "types"]
	});
	$(treeType+suffix).jstree().show_dots();
}


function selectOntree(data, treeName, reverseTree, selectedTaxon, argTab, j1, j2){
  console.dir(selectedTaxon[argTab[0]]);
	for(m = 0, n = selectedTaxon[argTab[0]].length; m < n; m++) {
		selectedTaxon[argTab[1]].push(selectedTaxon[argTab[0]][m].replace(j1,j2));
	}
	$(reverseTree).jstree().enable_node(selectedTaxon[argTab[1]]);

	selectedTaxon[argTab[0]] = data.selected
	selectedTaxon[argTab[1]] = []
	for(m = 0, n = selectedTaxon[argTab[0]].length; m < n; m++) {
		selectedTaxon[argTab[1]].push(selectedTaxon[argTab[0]][m].replace(j1,j2));
		}
	$(reverseTree).jstree().disable_node(selectedTaxon[argTab[1]]);

	selectedTaxon[argTab[3]] = [];
	for(i = 0, j = selectedTaxon[argTab[0]].length; i < j; i++) {
		selectedTaxon[argTab[3]].push(data.instance.get_node(selectedTaxon[argTab[0]][i]).text);
	};

	noSelected=[]
	for(i=0;i<selectedTaxon[argTab[2]].length;i++){
		noSelected.push(selectedTaxon[argTab[2]][i].replace(j2,j1))
	}
	$(treeName).jstree(true).uncheck_node(noSelected);
}

function resetTree(suffix){
	$('#tree_include'+suffix).jstree().close_all();
	$('#tree_include'+suffix).jstree().deselect_all();
	$('#tree_exclude'+suffix).jstree().close_all();
	$('#tree_exclude'+suffix).jstree().deselect_all();
	$('#tree_include'+suffix).jstree().search('');
	$('#tree_exclude'+suffix).jstree().search('');
	$('#search_in'+suffix).val('')
	$('#search_notin'+suffix).val('')
}

function submitTree(selectedTaxon, isSG){
	if(selectedTaxon["includeIdList"].length==0){
		window.alert('You have to choose at least one included genome')
		return
	}
  suffix = (isSG) ? "_sg" : "";

	$('#tree'+ suffix).hide()
	$("#submit_trees" + suffix).hide();
	$("#reset_trees" + suffix).hide();
	$('#list_selection' + suffix).show();
	$('#confirm_y' + suffix).show()
	$('#confirm_n' + suffix).show()
	$('#ShowIN' + suffix).show()
	$('#ShowNOTIN' + suffix).show()
  if(isSG){
    $('#ShowSeq').hide()
    displaySelection(selectedTaxon, "#InView_sg", "#NotInView_sg", '#tree_include_sg', '#tree_exclude_sg')
  }else{
    displaySelection(selectedTaxon, "#InView", "#NotInView", '#tree_include', '#tree_exclude')
  }
}


// *********************************************
//            *  TREAT RESULTS *
// *********************************************
function display_download(tag) {
    onDownload(tag)
    return;
}

function onDownload(data) {
    $('#result-file').html('<a href="download/' + data +'" >Download results</a>')
}

function writeResults(obj){
	var out=''
	for (i=0;i<obj.length;i++){
		line_seq=0
		seq=obj[i].sequence
		number_genomes=obj[i].occurences.length
		for(j=0;j<number_genomes;j++){
			line_genome=0
			org=obj[i].occurences[j].org
			org_split=org.split(' ')
			ref_org=org_split.pop()
			number_ref=obj[i].occurences[j].all_ref.length
			for(k=0;k<number_ref;k++){
				ref=obj[i].occurences[j].all_ref[k].ref
				number_coords=obj[i].occurences[j].all_ref[k].coords.length
				line_genome+=number_coords
				line_seq+=number_coords
				for(l=0;l<number_coords;l++){
					coord=obj[i].occurences[j].all_ref[k].coords[l]
					print_coord='<td>'+coord+'</td></tr>'
					out=print_coord+out
				}
				print_ref='<td rowspan="'+number_coords+'">' + ref + '</td>'
				out=print_ref+out
			}
			print_org='<td rowspan="'+line_genome+'">' + org_split.join(' ') + '</td>'
			out=print_org+out
		}
		print_seq='<td rowspan="'+line_seq+'" valign="top">' + seq + '</td>'
		out=print_seq+out

	}
	var header='<tr class = "w3-light-grey"> <th> sgRNA sequence </th> <th> Organism(s) </th> <th colspan=2> Coordinates </th> </tr>'
	out=header+out
	return out

}
function treatResults(results, isSg){
	$("#Waiting").hide();
    var data = results.data;

	if (results.data.length >= 6){

		$('#Result').show()
		res=data[0];
    not_in=data[1] ? data[1] : '';
		tag=data[2];
		number_hits=data[3];
		let data_card =data[4];
		let gi=data[5];
    let node = document.createElement("result-page");
    let resDiv = document.querySelector("#ResGraph");
    resDiv.appendChild(node);

    if(isSg){
      let gene = data[6];
      node.setAttribute("gene", JSON.stringify(gene));
    }
		let obj = res;

		node.setAttribute( "complete_data", JSON.stringify(res) );
		node.setAttribute( "all_data", JSON.stringify(data_card) );
		node.setAttribute("org_names", gi);


		console.log("bip");
		console.dir(res);
		//var obj = JSON.parse(res);
		var infos='<p>' +number_hits + ' hits have been found for this research.' ;
		if (parseInt(number_hits)>100){
			infos+='. Only the best 100 are written below. Download the result file to get more hits.'
		}
		if (parseInt(number_hits)>10000){
			infos+=' (only the best 10 000 are written to this file).</p>'
		}
    infos +='</br><i class="material-icons" id="drop_not_in off" onclick="clickDrop(this)">arrow_drop_down</i>'
		if (not_in!=''){
			infos+='<p> All hits are absent (based on Bowtie2 alignment) from excluded genome(s) : '+not_in;
		}
		else{
			infos+='<p> No excluded genomes selected.</p>'
		}
		out=writeResults(obj)
		$('#infos').html(infos)
		$("#ResTable").html(out);
		display_download(tag)

    }
	else{ // Check it works properly
		$("#NoResult").show();
		infos='<p>'+data[0]+'</p> <p> '+data[1]+'</p>'
		$("#no_result").html(infos);
	}
}


// *********************************************
//            *  TREAT FASTA FILE *
// *********************************************
function verifyFasta(seq){
	var error='no error'
	var authorized=['A','T','C','G','a','t','c','g']
	var nbre_seq=0
	var seq_finale=''
	var sequence_split=seq.split('\n')
	for(i=0;i<sequence_split.length;i++){
		if (sequence_split[i][0]=='>'){
			nbre_seq+=1
			if(nbre_seq>1){
				error='More than 1 sequence'
				return [error,0]
			}
		}
		else{
			for (j=0;j<sequence_split[i].length;j++){
				if (!(authorized.includes(sequence_split[i][j]))){
					error="Wrong sequence. Only nucleotide characters authorized"
					return [error,0]
				}
				else{
					seq_finale+=sequence_split[i][j]
				}
			}

		}
	}
	return [error,seq_finale]
}

function loadFile(id){
			if ( ! window.FileReader ) {
				return alert( 'FileReader API is not supported by your browser.' );
			}
			var $i = $(id), // Put file input ID here
				input = $i[0];
			if ( input.files && input.files[0] ) {
				file = input.files[0]; // The file
				fr = new FileReader(); // FileReader instance

				fr.readAsText( file );
				fr.onload = function () {
					// Do stuff on onload, use fr.result for contents of file
					sequence=fr.result
					$('#seq').val(sequence)
				};
			}
			else {
				// Handle errors here
				alert( "File not selected or browser incompatible." )
			}
}

function treatFastaFile(){
	$('a[name=error-load]').hide()
	fastaname=$("#fasta-file").val()

	if(fastaname==''){
		$('a[name=error-load]').show()
		$('a[name=error-load]').html('No file selected')
		return
	}
	else{
		loadFile('#fasta-file')
	}
}

function displaySequence(){
	sequence=$('#seq').val()
	error_fasta=verifyFasta(sequence)
	if(error_fasta[0]!="no error"){
		window.alert('Sequence not in fasta format')
		return false
	}
	final_sequence=error_fasta[1]
	if(final_sequence==''){
		window.alert('Empty sequence')
		return false
	}
	$('#ShowSeq').show()
	$('#ShowSeq').html("<h5 class='w3-container w3-light-green'>Your query:</h5><div class='w3-margin'>"+sequence+"</div>")
	$('#spec_tips').hide()
	$('a[name=error-fasta]').hide()
	$("#Sequenceupload").hide()
	$('#next').hide()
	$('#list').hide()
	$('#changeSeq').show()
	$('#tree_sg').show()
	$('#reset_trees_sg').show()
	$('#submit_trees_sg').show()
	resetTree('_sg')

}

// *********************************************
//        *  DISPLAY & TREAT SELECTIONS  *
// *********************************************
function displaySelection(selectedTaxon, divView, divNotView, treeIn, treeEx){
	for (i=0;i<selectedTaxon["includeNameList"].length;i++){
		node=selectedTaxon["includeIdList"][i]
		if ($(treeIn).jstree().is_leaf(node)){
			n=new Option(selectedTaxon["includeNameList"][i]);
			$(n).html(selectedTaxon["includeNameList"][i]);
			$(divView).append(n);	//Adds the contents of 'includeNameList' array into the 'InView'
		}

	};
	for (i=0;i<selectedTaxon["excludeNameList"].length;i++){
		node=selectedTaxon["excludeIdList"][i]
		if ($(treeEx).jstree().is_leaf(node)){
			n=new Option(selectedTaxon["excludeNameList"][i]);
			$(n).html(selectedTaxon["excludeNameList"][i]);
			$(divNotView).append(n);	//Adds the contents of 'includeNameList' array into the 'InView'
		}
	};
}

function confirmSelection(suffix){
	$('#confirm_y'+suffix).hide()
	$('#confirm_n'+suffix).hide()
	$('#other_parameters'+suffix).show()
	$('#submitbtn'+suffix).show()
}

function resetSelection(suffix){
	$('#list_selection'+suffix).hide()
	$("#ShowIN"+suffix).hide();
	$("#ShowNOTIN"+suffix).hide();
	$('#tree').show();
	$("#submit_trees"+suffix).show();
	$("#reset_trees"+suffix).show();
	clearListView(suffix)
}

function clearListView(suffix){
	length_in=document.getElementById('InView'+suffix).options.length
	length_notin=document.getElementById('NotInView'+suffix).options.length
	for(i=0;i<length_in;i++){
		document.getElementById('InView'+suffix).options[0].remove()
	}
	for(j=0;j<length_notin;j++){
		document.getElementById('NotInView'+suffix).options[0].remove()
	}
}

// *********************************************
//            *  SUBMIT PARAMETERS *
// *********************************************
function submitSetupAllGenome(selectedTaxon){
	$('#Tabselection').hide()
	$('#allg_tips').hide()
	$('#list_selection').hide()
	$('#other_parameters').hide()

	$('#Waiting').show()
	GIN=JSON.stringify(selectedTaxon["includeNameList"]);
	GNOTIN=JSON.stringify(selectedTaxon["excludeNameList"]);
	PAM=$("select[name='pam_AllG'] > option:selected").val();
	SGRNA=$("select[name='sgrna-length_AllG'] > option:selected").val();

}

function submitSpecificGene(selectedTaxon){
	$("#Tabselection").hide();

	$('#spec_tips').hide();
	$('#ShowSeq').hide();
	$('#tree_sg').hide()
	$('#list_selection_sg').hide();
	$('#other_parameters_sg').hide();
	$('#Waiting').show();
	/*
	var N=JSON.stringify(n_gene);
	var PID=JSON.stringify(percent_id);
	var SEQ=JSON.stringify(final_sequence);
	var GIN=JSON.stringify(includeNameListSG);
	var GNOTIN=JSON.stringify(excludeNameListSG);
	var PAM=JSON.stringify(pam);
	var LENGTH=JSON.stringify(sgrna_length);
	*/
	socket.emit("submitSpecific", { "seq"   : final_sequence,
									"gi"   : selectedTaxon["includeNameList"],
									"gni": selectedTaxon["excludeNameList"],
									"n"     : n_gene,
									"pid"   : percent_id,
									"pam"   : pam,
									"sgrna_length":sgrna_length
							});

}

function paramSpecificGene(){
	n_gene=$("#search-region").val()
	percent_id=$("#percent-identity").val()
	pam=$("select[name='pam'] > option:selected").val();
	sgrna_length=$("select[name='sgrna-length'] > option:selected").val();

}

function error_gestion(){
	var errors=false
	try{
		if (n_gene=='')throw "format error";
		else if(n_gene<0)throw "can't be negative";
		else if(n_gene>0 && n_gene<=parseInt(sgrna_length)+parseInt(pam.length))throw "can't be smaller than sgRNA length"
		else if(n_gene>=final_sequence.length)throw "can't be larger than sequence length"
	}
	catch(err){
		$('a[name=error-n]').show()
		$('a[name=error-n]').html(err)
		errors=true
	}

	try{
		if (percent_id=='')throw "format error";
		else if(percent_id<0 || percent_id>100)throw"must be between 0 and 100";
	}
	catch(err){
		$('a[name=error-pid]').show()
		$('a[name=error-pid]').html(err)
		errors=true
	}
	return errors
}

function setupAll(){
	$('#AG_click').show()
	$('#allg_tips').hide()
	$('#tree').hide()
	$('#list_selection').hide()
	$('#AG_click2').hide()
	$('#SG_click2').hide()
	$('#footer').hide()
	$('#spec_tips').hide()
	$('#list_selection_sg').hide()
	$('#Sequenceupload').hide()
	$('#tree_sg').hide()
	$('#next').hide()
	$('#other_parameters_sg').hide()
	$('#ShowSeq').hide()
	displayTree('', '#search_in', '#tree_include')
	displayTree('', '#search_notin', '#tree_exclude')
	displayTree('_sg', '#search_in', '#tree_include')
	displayTree('_sg', '#search_notin', '#tree_exclude')
}

function setupAllGenome(){
	$('#footer').show()
	$('#allg_tips').show()
	$('#tree').show()
	$('#submit_trees').show()
	$('#reset_trees').show()
	$('#SG_click').hide()
	$('#SG_click2').show()
	$('#AG_click').show()
	$('#AG_click2').hide()
	$('#search_in').val('')
	$('#search_notin').val('')
	$('#spec_tips').hide()
	$('#other_parameters').hide()
	//excludeIdList=[]
	//includeIdList=[]

}

function setupSpecificGene(){
	$("#search-region").val('100')
	$("#percent-identity").val('70')
	$("select[name='pam'] > option:selected").val('NGG');
	$("select[name='sgrna-length'] > option:selected").val('20');

	$('#footer').show()
	$('#allg_tips').hide()
	$('#tree').hide()
	$('#AG_click').hide()
	$('#AG_click2').show()
	$('#SG_click2').hide()
	$('#other_parameters_sg').hide()
	$('#other_parameters').hide()
	$('#SG_click').show()
	$('#spec_tips').show()
	$('#Sequenceupload').show()
	$('#seq').val('')
	$('#next').show()
	$('a[name=error-n]').hide()
	$('a[name=error-pid]').hide()

}


$(document).ready(function(){
  let selectedTaxonAG = {includeIdList:[], excludeIdList:[], disabledInc:[], disabledExc:[], includeNameList:[], excludeNameList:[]};
  let selectedTaxonSG = {includeIdList:[], excludeIdList:[], disabledInc:[], disabledExc:[], includeNameList:[], excludeNameList:[]};
	setupAll()

	$('#AG_click').click(function(){
		setupAll()
		setupAllGenome()
		resetTree('')
	})

	$('#AG_click2').click(function(){
		setupAll()
		setupAllGenome()
		resetTree('')
	})
//  TREE
	$('#tree_include').on("changed.jstree",function(e,data){
    selectOntree(data, "#tree_include", "#tree_exclude", selectedTaxonAG, ["includeIdList", "disabledExc", "excludeIdList", "includeNameList"] , "j1", "j2")
    console.dir(selectedTaxonAG["includeIdList"])
	})

	$('#tree_exclude').on("changed.jstree", function (e, data) {	// replace changed for onclicked like below
    selectOntree(data, "#tree_exclude", "#tree_include", selectedTaxonAG, ["excludeIdList", "disabledInc", "includeIdList", "excludeNameList"] , "j2", "j1")
	})

  $('#tree_include_sg').on("changed.jstree",function(e,data){
  	selectOntree(data, '#tree_include_sg', '#tree_exclude_sg', selectedTaxonSG, ["includeIdList", "disabledExc", "excludeIdList", "includeNameList"], 'j3', 'j4')

	})

	$('#tree_exclude_sg').on("changed.jstree",function(e,data){
  	selectOntree(data, '#tree_exclude_sg', '#tree_include_sg', selectedTaxonSG, ["excludeIdList", "disabledInc", "includeIdList", "excludeNameList"], 'j4', 'j3')

	})

	$('#reset_trees').click(function(){
		resetTree('')
	})

	$('#submit_trees').click(function(){
		submitTree(selectedTaxonAG, false)
	})

	$('#confirm_y').click(function(){
		confirmSelection('')
	})

	$('#confirm_n').click(function(){
		resetSelection('')
	})

	$('#submitbtn').click(function(){
		submitSetupAllGenome(selectedTaxonAG)
    socket.emit('submitAllGenomes', {gi:GIN,gni:GNOTIN,pam:PAM,sgrna_length:SGRNA});
	})


	$('#SG_click').click(function(){
		setupAll()
		setupSpecificGene()
	})


	$('#SG_click2').click(function(){
		setupAll()
		setupSpecificGene()
	})

	$('#load-file').click(treatFastaFile)

	$('#next').click(function(){
		displaySequence()

	})


	$('#reset_trees_sg').click(function(){
		resetTree('_sg')
	})

	$('#submit_trees_sg').click(() => submitTree(selectedTaxonSG, true))

	$('#confirm_y_sg').click(function(){
		confirmSelection('_sg')
	})

	$('#confirm_n_sg').click(function(){
		resetSelection('_sg')
	})


	$('#submitbtn_sg').click(function(){
		paramSpecificGene()
		if (error_gestion()==true){
			window.alert('Error(s) in parameters')
		}
		else{
			submitSpecificGene(selectedTaxonSG)
		}

	})
})

function reloadpage() {
    location.reload();
}

// change active link for tab-nav and change results to show
function clickNav(d) {
  // check if clicked nav is not the active one
  if(d.className != "nav-link active"){
    let allNav = document.querySelectorAll(".nav-link");
    // all nav-tab set to not active
    allNav.forEach(e => e.className="nav-link");
    // active the one clicked
    d.className="nav-link active";
    // show/hide results
    if (d.id == "graphicResult") {
      document.querySelector("result-page").style.display="block";
      document.querySelector("#ResTable").style.display="none";
    } else if (d.id == "tableResult") {
      document.querySelector("result-page").style.display="none";
      document.querySelector("#ResTable").style.display="block";
    }
  }
}

function clickDrop(d) {
  if(d.id.split(' ')[1] == "off") {
    d.id = "drop_not_in on";
    document.querySelector("#infos>p:nth-child(2)").style.display="block";
    d.innerHTML="arrow_drop_up";

  } else {
    d.id = "drop_not_in off";
    document.querySelector("#infos>p:nth-child(2)").style.display="none";
    d.innerHTML="arrow_drop_down";
  }
}
