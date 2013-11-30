var template_raw = '<table> \
	<% var j = 0 %> \
	<% for(var i = 0; i < members.length; i++){ %> \
		<% if(j == 0){ %> \
			<tr> \
		<% } %> \
			<td class="character"> \
				<img data-member="<%= members[i].name %>" src="images/' + theUniverse + '/<%= members[i].photo %>" alt="<%= members[i].name %>" title="<%= members[i].name %>" /> \
			</td> \
		<% if(j == 13){ %> \
			</tr> \
		<% } %> \
		<% if(j < 13){ %> \
			<% j++ %> \
		<% } else { %> \
			<% j = 0 %> \
		<% } %> \
	<% } %> \
	</table>'

var teams_raw = '<h5>Team Affiliations</h5> \
	<ul class="list-unstyled"> \
		<% for(var i = 0; i < teams_aff.length; i++){ %> \
			<% var teamData = (teams_aff[i].link) %> \
			<li><a href="javascript:void(0)" data-team="<%= teamData %>"><%= teams_aff[i].name %></a></li> \
		<% } %> \
	</ul>'

var bio_raw = '<h4><%= result[0].name %></h4> \
	<% if(result[0].photo !== "placeholder.jpg"){ %> \
	<img src="images/' + theUniverse + '/<%= result[0].photo %>" class="treatment" /> \
	<% } %> \
	<h5><%= result[0].realName %></h5> \
	<p><%= result[0].bio %></p>'

var template_tooltip = '<p class="name"><%= result.birthPlace %></p>'