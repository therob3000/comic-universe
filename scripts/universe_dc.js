var container_parent = $('.display') ,
	chart_container = $('#map'),
	width = container_parent.width(),
	height = (width * .5),
	vis, vis_group, aspect,
	hud_vis, hud_vis_group, aspect, photo

var margins = {top: 15, right: 10, bottom: 10, left: 120}

var membersFiltered,
	memberSelected,
	members = [],
	labels = ['Intelligence', 'Strength', 'Speed', 'Durability', 'Energy Projection', 'Fighting Skills']

var theUniverse = 'universe_dc',
	theTeam = 'justice_league_of_america'

var projection,
	path,
	map_lines,
	centered,
	timeout

var defaults = {
	memberBioCont: {
		width: 280,
		fill: 'rgba(255,255,255,0)'
	},
	map: {
		fill: 'rgba(255,255,255,.8)',
		center: [ 30, 15 ],
		scale: 150,
		rotate: [ 0, 0 ]
	},
	powerGrid: {
		width: width / 4,
		height: 100,
		stroke_color: 'rgba(153,153,153,.5)',
		stroke_offset: 2,
		text_color: 'rgba(51,51,51,1)'
	},
	markerSettings: {
		width: 180,
		height: 25,
		rx: 5,
		ry: 5,
		fill: 'rgba(255,255,255,.35)',
		duration: 500
	}
}

function Member(c){
	this.name = isDefined(c.name)
	this.photo = isDefined(c.photo)
	this.realName = isDefined(c.real_name)
	this.birthPlace = isDefined(c.birth_place)
	this.lat = isDefined(c.lat)
	this.lng = isDefined(c.lng)
	this.bio = isDefined(c.bio)
	this.appearance = isDefined(c.first_appearance)
	this.color01Rgba = isDefined(c.colors[0].rgba)
	this.color02Rgba = isDefined(c.colors[1].rgba)
	this.power_grid = isDefined(c.power_grid)
	this.teams = isDefined(c.team_affiliations)
}

$(document).ready(function(){
	Data.get(theTeam)
})

var SVG = new function(){
	this.set = function(m){
		vis = d3.select('#map').append('svg')
			.attr({
				'width': width,
				'height': height,
				'preserveAspectRatio': 'xMinYMid',
				'viewBox': '0 0 ' + width + ' ' + height
			})

		vis_group = vis.append('g')
			.attr({
				'width': width,
				'height': height
			})

		hud_vis = d3.select('#map').append('svg')
			.attr({
				'class': 'hud',
				'width': width,
				'height': 200
			})

		hud_vis.append('rect')
			.attr({
				'width': width,
				'height': 150,
				'fill': 'rgba(255,255,255,.8)'
			})
			
		photo = d3.select('#photo').append('div')
			.attr({
				'class': 'photo_group'
			})

		stats = d3.select('#stats').append('div')
			.attr({
				'class': 'stats_group'
			})

		hud_vis_group = hud_vis.append('g')
			.attr({
				'class': 'hud_group',
				'width': width / 4,
				'transform': 'translate(' + width / 3 + ',' + margins.top + ')'
			})

		Map.set()
		Members.renderMemberBio('team_change')
		PowerGrid.set()
	}
}

var Map = new function(){
	this.set = function(){
		projection = d3.geo.mercator()
			.center(defaults.map.center)
			.scale(defaults.map.scale)
			.rotate(defaults.map.rotate)

		path = d3.geo.path()
			.projection(projection)

		theMap = vis_group.append('g')
			.attr({
				'class': 'map'
			})

		var mapBackground = theMap.append('rect')
			.attr({
				'width': width,
				'height': height,
				'fill': defaults.map.fill
			})

		d3.json('data/world-110m.json', function(error, topology){
			map_lines = theMap.append('g')
				.attr({
					'class': 'map_lines'
				})

			map_lines.selectAll('path')
				.data(topojson.feature(topology, topology.objects.countries).features)
					.enter().append('path')
				.attr({
					'd': path
				})
				// .on('click', locationClicked)

			markerGroup = map_lines.append('g')

			toolTipGroup = vis_group.append('g')
				.attr({
					'transform': 'translate(' + projection([ membersFiltered[0].lng, membersFiltered[0].lat ])[0] + ', ' + (projection([ membersFiltered[0].lng, membersFiltered[0].lat ])[1] - 30) + ')'
				})

			Marker.set()
		})
	}
}

var Data = new function(){
	// gets data from json file and creates an array of members
	this.get = function(team){
		$.getJSON('data/' + theUniverse + '.json', function(data){
			data.forEach(function(ch){
				var teamMember = new Member(ch)
				members.push(teamMember)
			})

			members.forEach(function(c, i){
				var powers = []
				powers.push(members[i].power_grid[0]['intelligence'])
				powers.push(members[i].power_grid[0]['strength'])
				powers.push(members[i].power_grid[0]['speed'])
				powers.push(members[i].power_grid[0]['durability'])
				powers.push(members[i].power_grid[0]['energy_projection'])
				powers.push(members[i].power_grid[0]['fighting_skills'])
				c.power = powers
			})

			members.forEach(function(c, i){
				var teams = []
				c.teams.forEach(function(t){
					var team_info = {
						name: t,
						link: t.toLowerCase().replace(/[- ]+/g,'_')
					}
					teams.push(team_info)
				})
				c.teams = teams
			})

			Data.sort(team)

		})
	}

	// takes the members array and filters the members based on user selection
	this.sort = function(team){
		membersFiltered = []
		$('#team_roster, #map').html('')

		membersFiltered = members.filter(function filterCharacters(el){
			var returnVal = false
			var allTeams = el.teams
			allTeams.forEach(function(t, i){
				if(t.link === team){
					returnVal = true
				}
			})
			return returnVal
		})
	
		SVG.set(membersFiltered)
		Members.renderTeamTemplate(membersFiltered)
	}
}

var Members = new function(){
	this.renderTeamTemplate = function(m){
		$('.team_title').html(theTeam == 'xmen' ? 'X-Men' : theTeam.replace(/_/g, ' '))
		$('.member_title').html(m[0].name)

		var template_compiled = _.template(template_raw, {
			members: m
		})
		$('#team_roster').html(template_compiled)

		$('.character img').bind('click', function(){
			barsGroup.remove()
			
			var thisTeamMember = $(this).data('member')
			memberSelected = m.filter(function(r) {
				return r.name == thisTeamMember
			})

			$('.member_title').html(memberSelected[0].name)

			Members.renderTeamList()
			Members.renderMemberBio('member_change')
			Marker.set(memberSelected)
			PowerGrid.animate(memberSelected[0].power, memberSelected[0].color01Rgba)
		})

		teamGroup = vis_group.append('g')
			.attr({
				'class': 'teams'
			})	
	}

	this.renderTeamList = function(){
		// is there a better way to do this?
		d3.select('.team_rect').remove()
		d3.select('.team_text').remove()

		var team_rect = teamGroup.append('rect')
			.attr({
				'class': 'team_rect',
				'x': 0,
				'y': height - 210,
				'width': 180,
				'height': 210,
				'rx': 5,
				'fill': 'rgba(' + memberSelected[0].color01Rgba + ')',
				'opacity': .2
			})

		var teams_compiled = _.template(teams_raw, {
			teams_aff: memberSelected[0].teams
		})

		var team_text = teamGroup.append('foreignObject')
			.attr({
				'x': 0,
				'y': height - 210,
				'width': 170,
				'height': 210
			})
			.append('xhtml:body')
				.attr({ 'class': 'team_text' })
			.html(teams_compiled)

		$('.team_text a').bind('click', function(){
			theTeam = $(this).data('team')
			Data.sort(theTeam)
		})
	}

	this.renderMemberBio = function(change){
		memberSelected = change == 'team_change' ? membersFiltered : memberSelected

		d3.select('.tool_tip_group').remove()
		d3.select('.member_bio_container').remove()
		clearTimeout(timeout)

		var memberBioContainer = vis_group.append('g')
			.attr({ 'class': 'member_bio_container' })

		var memberBio = memberBioContainer.append('rect')
			.attr({
				'x': width - defaults.memberBioCont.width,
				'y': 0,
				'width': defaults.memberBioCont.width,
				'height': height - 120,
				'fill': defaults.memberBioCont.fill
			})

		var bio_compiled = _.template(bio_raw, {
			result: memberSelected
		})

		var text = memberBioContainer.append('foreignObject')
			.attr({
				'x': width - defaults.memberBioCont.width - 10,
				'y': 10,
				'width': defaults.memberBioCont.width,
				'height': height - 10
			})
			.append('xhtml:body')
				.attr({ 'class': 'character_bio' })
			.html(bio_compiled)
	}
}

var Marker = new function(){
	this.set = function(){
		if(memberSelected[0].lat !== 0 && memberSelected[0].lng !== 0){
			if(memberSelected == undefined){
				memberSelected = membersFiltered
			}
			var toolTipGroup = vis_group.append('g')
				.attr({
					'class': 'tool_tip_group',
					'transform': 'translate(' + projection([ memberSelected[0].lng, memberSelected[0].lat ])[0] + ', ' + (projection([ memberSelected[0].lng, memberSelected[0].lat ])[1] - 30) + ')'
				})

			toolTipGroup.append('rect')
				.attr({
					'width': defaults.markerSettings.width,
					'height': defaults.markerSettings.height,
					'rx': defaults.markerSettings.rx,
					'ry': defaults.markerSettings.ry,
					'fill': defaults.markerSettings.fill
				})

			var toolTipText = toolTipGroup.append('text')
				.attr({
					'class': 'tooltip_text',
					'dx': '.2em',
					'dy': '1.2em',
					'opacity': 0
				})
				.text(memberSelected[0].birthPlace)

			toolTipText
				.transition()
				.duration(defaults.markerSettings.duration)
				.ease(Math.sqrt)
					.attr({
						'opacity': 1
					})
		
			pulseMarker(memberSelected[0].lat, memberSelected[0].lng, memberSelected[0].color01Rgba, memberSelected[0].color02Rgba)
		}
	}
}

var PowerGrid = new function(){
	this.set = function(){

		photo.append('image')
			.attr({
				'width': 300,
				'height': 200,
				'src': 'images/universe_marvel/professorx.jpg'	
			})



		hud_vis_group.append('text')
			.attr({
				'class': 'hud_heading'
			})
			.text('Abilities')

		powerGridGroup = hud_vis_group.append('g')
			.attr({
				'class': 'power_grid',
				'transform': 'translate(' + margins.left + ', ' + margins.top + ')'
			})
			// .attr({
			// 	'class': 'power_grid',
			// 	'transform': 'translate(' + (width - defaults.powerGrid.width - margins.right) + ', ' + (height - defaults.powerGrid.height) + ')'
			// })

		x = d3.scale.linear()
			.domain([ 0, 7 ])
			.range([ 0, defaults.powerGrid.width ])

		y = d3.scale.ordinal()
			.domain(labels)
			.rangeBands([ 0, defaults.powerGrid.height ], .1)

		var lines = powerGridGroup.append('g')

		lines.selectAll('line')
			.data(x.ticks(7))
				.enter().append('line')
			.attr({
				'x1': x,
				'x2': x,
				'y1': defaults.powerGrid.stroke_offset,
				'y2': defaults.powerGrid.height - defaults.powerGrid.stroke_offset
			})
			.style({
				'stroke': defaults.powerGrid.stroke_color
			})

		var xAxis = powerGridGroup.append('g')

		xAxis.selectAll('text')
			.data(x.ticks(7))
				.enter().append('text')
			.attr({
				'x': x,
				'y': 0,
				'text-anchor': 'middle',
				'fill': defaults.powerGrid.text_color
			})
			.style({
				'font-size': '10px'
			})
			.text(String)

		var yAxis = powerGridGroup.append('g')

		yAxis.selectAll('text')
			.data(labels)
				.enter().append('text')
			.attr({
				'x': function(d){
					return 0 - 8
				},
				'y': function(d, i){
					return y(d) + y.rangeBand() / 2
				},
				'dy': '.36em',
				'text-anchor': 'end',
				'fill': defaults.powerGrid.text_color
			})
			.style({
				'font-size': '12px'
			})
			.text(String)

		PowerGrid.animate(membersFiltered[0].power, membersFiltered[0].color01Rgba)
	}

	this.animate = function(powers, color){
		barsGroup = powerGridGroup.append('g')

		var bars = barsGroup.selectAll('rect')
			.data(powers)
				.enter().append('rect')
			.attr({
				'width': 0
			})
			
		bars
			.transition()
			.duration(300)
			.ease('quad')
				.attr({
					'class': 'bars',
					'x': 0,
					'y': function(d, i){
						return y(i)
					},
					'width': function(d, i){
						return x(d)
					},
					'height': y.rangeBand(),
					'fill': 'rgba(' + color + ')'
				})
	}
}

var isDefined = function(obj){
	return typeof(obj) !== 'undefined' && obj !== null ? obj : ''
}

function pulseMarker(lat, lng, color01, color02) {
	var marker = markerGroup.append('circle')
		.attr({
			'cx': function(d){
				if(lng !== 0 && lat !== 0){
					return projection([ lng, lat ])[0]
				}
			},
			'cy': function(d){
				if(lng !== 0 && lat !== 0){
					return projection([ lng, lat ])[1]
				}
			},
			'r': 5,
			'fill': function(d){
				return 'rgba(' + color02 + ')'
			},
			'stroke-width': 2,
			'stroke': function(d){
				return 'rgba(' + color01 + ')'
			}
		})
		.transition()
			.duration(700)
			.ease(Math.sqrt)
			.attr('r', 10)
			.style('fill-opacity', 1e-6)
		.each('end', function(){
			d3.select(this)
				.transition()
					.duration(400)
					.ease(Math.sqrt)
					.attr('r', 20)
					.style('stroke-opacity', 1e-6)
				.remove()
		})

		timeout = setTimeout(pulseMarker, 1500, lat, lng, color01, color02)
}

// function locationClicked(d){
// 	var x, y, k

// 	if(d && centered !== d){
// 		var centroid = path.centroid(d)
// 		x = centroid[0]
// 		y = centroid[1]
// 		k = 4
// 		centered = d
// 	} else {
// 		x = width / 2
// 		y = height / 2
// 		k = 1
// 		centered = null
// 	}

// 	map_lines.selectAll('path')
// 		.classed('active', centered && function(d){
// 			return d === centered
// 		})

// 	map_lines.transition()
// 		.duration(750)
// 		.attr({
// 			'transform': 'translate(' + width / 2 + ',' + height / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')'
// 		})
// 		.style({
// 			'stroke-width': 1.5 / k + 'px'
// 		})
// }

// $(window).on('resize', function() {
// 	var targetWidth = container_parent.width()
// 	vis.attr({
// 		'width': targetWidth,
// 		'height': Math.round(targetWidth / aspect)
// 	})
// })