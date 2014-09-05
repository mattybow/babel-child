(function($,FishboneModel,hbs,Socket,Chart){
	var Worker = FishboneModel({
		kills:100,
		getKills:function(){
			return this.kills;
		},
		trimSpaces:function(str) {
			return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		},
		getText:function(){
			//alert('asdasfd');
			var text = $('textarea').val();
			if(text) text = this.trimSpaces(text);
			return text;
		},
		size:function(obj){
			var counter=0;
			if(typeof obj==='object'){
				for(var key in obj){
					counter++;
				}
			}
			return counter;
		},
		dayNames:{0:'Sun',1:'Mon',2:'Tues',3:'Wed',4:'Thur',5:'Fri',6:'Sat'},
		monthNames:{0: "Jan", 1: "Feb", 2: "Mar", 3: "Apr", 4: "May", 5: "Jun", 6: "Jul", 7: "Aug", 8: "Sep", 9: "Oct", 10: "Nov", 11: "Dec"}
	});

	var CurtainView = Worker.extend({
		init:function(){
			this.setListeners();
		},
		setListeners:function(){
			$('textarea').on('keyup',this.keyupHandler);
			$('textarea').on('keydown',this.keydownHandler);
			$('#chatSubmit').on('click',this.clickHandler);
		},
		stopListeners:function(){
			$('textarea').off('keyup').off('keydown');
			$('#chatSubmit').off('click');
		},
		keyupHandler:function(ev){
			var text = this.getText();
			var key = ev.which;
			if(text.length===0){
				this.hideCheck();
			} else if (text.length>0 && key!==13) {
				this.validate(text);
			}
		},
		validate:function(text){
			this.valid = false;
			$.ajax({
				url:"/validate/"+text,
				context:this
			}).done(function(data){
				if(data.status==='ok' && this.getText().length){
					this.showCheck();
					this.valid = true;
				} else {
					this.hideCheck();
					this.valid = false;
				}
			});
		},
		showCheck:function(){
			$('#inputCheck').fadeTo(200,0.9);
		},
		hideCheck:function(){
			$('#inputCheck').fadeTo(10,0);
		},
		keydownHandler:function(ev){
			if(ev.which===13){
				ev.preventDefault();
				this.checkInput();
			}
		},
		checkInput:function(){
			this.initials = this.getText();
			if ($('textarea').val() && this.valid){
				this.hideCheck();
				this.removeCurtain();
				$('textarea').addClass("hidden");
			}
		},
		removeCurtain:function(){
			this.stopListeners();
			var activeChatView = new ChatView(this.initials);
			$('.curtain').slideUp(200);
			$('textarea').val('');
			$('textarea').removeAttr("placeholder").removeAttr("maxlength");
		},
		clickHandler:function(){
			this.checkInput();
		}
	});

	var ChatView = Worker.extend({
		init:function(initials){
			this.initials = initials;
			this.lastDate = '';
			this.colorDict = {};
			this.setListeners();
			this.socket = new Socket().connect();
			this.setSocketListeners();
			this.makeQuill();
			this.dateTemplate = hbs.compile('<div class="dayStamp"><hr><div class="dayText">{{ dateStr }}</div></div>');
			this.msgTemplate = hbs.compile('<li class="organ"><div class="message"><button class="btn btn-circle">&nbsp;<div>{{ initials }}</div></button><div class="dividerWrapper"><div class="messageContent"><p>{{ message }}</p></div><div class="timeStamp pull-right">{{ time }}</div></div></div></li>');
			this.userTemplate = hbs.compile('<li class="user-in-list">{{ initials }}<span class="removeIcon">+</span><div class="userMarker" style="background-color:{{ color }}"></div></li>');
			if(("Notification" in window) && (window.Notification.permission === 'default')) this.setPermission();
		},
		setSocketListeners:function(){
			var that = this;
			this.socket.on('who are you',function(){
				that.socket.emit('i am',that.initials);
				that.clearColors();
			});
			this.socket.on('message',function(msg){
				that.commitChat('',msg);
			});
			this.socket.on('update colors',function(data){
				that.setColors(data);
			});
			this.socket.on('user left',function(data){
				console.log(data);
				that.setColors(data);
			});
			this.socket.on('destroy',function(){
				that.destroy();
			});
		},
		makeQuill:function(){
			$("#editor").attr('contenteditable','true').focus();
			$('#editor').on('keydown',this.keydownHandler);
		},
		setPermission:function(){
			window.Notification.requestPermission(function(status){
				if (window.Notification.permission !== status) {
					window.Notification.permission = status;
					//update UI
				}
			});
		},
		setListeners:function(){
			$('textarea').on('keydown',this.keydownHandler);
			$('textarea').on('focusout',this.clickHandler);   //for phones
			$('#chatSubmit').on('click',this.clickHandler);
			$('.userWrapper').on('click',this.toggleUserControls);
			window.onblur = this.setNotifier.bind(this);
			window.onfocus = this.removeNotifier.bind(this);
		},
		setNotifier:function(){
			var that = this;
			this.missedCount = 0;
			this.socket.on('message',this.incMissedCount);
		},
		removeNotifier:function(){
			var that = this;
			this.socket.removeListener('message',this.incMissedCount);
		},
		incMissedCount:function(){
			this.missedCount++;
			if(this.missedCount===1){
				this.notifyUser();
			}
		},
		notifyUser:function(){
			if(window.Notification.permission==='granted'){
				var that = this;
				var options = {body:"you have new messages",icon:'/images/CHAT.png'};
				this.sendNotification('yo yo yo',options);
			}
		},
		sendNotification:function(title, options) {
			// notification.js from nickdesaulniers
			var sendNote, notification;
			if ("Notification" in window) {
				sendNote = function (title, options) {
					notification = new Notification(title, options);
					setTimeout(function(){notification.close();},6000);
				};
			} else if ("mozNotification" in navigator) {
				sendNote = function (title, options) {
			// Gecko < 22
					notification = navigator.mozNotification.createNotification(title, options.body, options.icon);
					notification.show();
					setTimeout(function(){notification.close();},6000);
				};
			} else {
				sendNote = function (title, options) {
					alert(title + ": " + options.body);
				};
			}
			sendNote(title, options);
		},
		destroy:function(){
			console.log('destroy message received');
			this.displayCurtain();
			this.hideUserControls();
			this.socket.destroy();
		},
		displayCurtain:function(){
			//console.log('curtain');
			$('.curtainMessage').html('connection terminated');
			$('.curtain').css('bottom','-1px');
			$('.curtain').slideDown(200);
			$('textarea').addClass('disabled');
		},
		setColors:function(dict){
			var newColors = {};
			var inactiveColors=[];
			var inactiveIndex=0;
			var newDict = {};
			var activeCount = 0;
			for(var key in dict){
				var color  = dict[key].color;
				var status = dict[key].status;
				if(status==='active'){
					newDict[key]=color;
					if(!(key in this.colorDict)){
						newColors[key]=color;
					}
					activeCount++;
					inactiveIndex++;
				}
				if ((key in this.colorDict) && status==='inactive') {				//if the status is inactive and the color is still in the dict
					inactiveColors.push(inactiveIndex);
					inactiveIndex++;
				}
			}
			//console.log(newColors);
			this.colorDict = newDict;
			this.updateChart(newColors,inactiveColors);
			this.updateCount(activeCount);
			this.updateUserMgmt();
		},
		clearColors:function(){
			for(var key in this.colorDict){
				this.userChart.removeData();
			}
			this.colorDict={};
		},
		updateCount:function(count){
			$('#userCount').html(count);
		},
		updateUserMgmt:function(){
			var html ='';
			for(var initials in this.colorDict){
				html = html + this.userTemplate({initials:initials, color:this.colorDict[initials]});
			}
			$('.userMgmt ul').html('').append(html);
			this.addRemoveListeners();
		},
		addRemoveListeners:function(){
			$(".user-in-list").on('click',this.terminateUser);
		},
		terminateUser:function(ev){
			var id = $(ev.target).closest('li').text();
			id = id.replace(/\+$/,'');
			console.log('terminate', id);
			this.socket.emit('terminate user',id);
		},
		updateChart:function(newColors,inactiveColors){
			var key;
			//console.log(newColors);
			if(this.size(newColors)){
				if(!this.userChart){
					var ctx = document.getElementById("connectedUsers").getContext("2d");
					var data=[];
					for(key in this.colorDict){
						data.push({value:1,color:this.colorDict[key]});
					}
					var options={percentageInnerCutout:80,segmentStrokeWidth:1,animationSteps:50};
					Chart.defaults.global.showTooltips = false;
					this.userChart = new Chart(ctx).Doughnut(data,options);
				} else {
					for(key in newColors){
						//console.log(key);
						this.userChart.addData({value:1,color:this.colorDict[key]});
					}
				}
			} else if (inactiveColors.length){
				for(key in inactiveColors){
					//console.log(inactiveColors[key]);
					this.userChart.removeData([inactiveColors[key]]);
				}
			}
		},
		keydownHandler:function(ev){
			if(ev.which===13 && !ev.shiftKey){
				ev.preventDefault();
				this.textHandler();
			}
		},
		clickHandler:function(){
			this.textHandler();
		},
		textHandler:function(){
			var text = $('#editor').html();
			if (text){
				this.commitChat(text);
				$('#editor').html('');
			}
		},
		getTime:function(){
			var timeString,amPM,hr,min;
			var date = new Date();
			amPM = 'am';
			hr  = date.getHours();
			min = date.getMinutes();
			if(hr>=12){
				amPM='pm';
				if(hr>12) hr -= 12;
			}
			if(min<10){
				min='0'+min;
			}
			timeString = hr+':'+min+amPM;
			return timeString;
		},
		getDateStr:function(){
			var dateString, dayName, day, month;
			var date = new Date();
			dayName = this.dayNames[date.getDay()];
			day     = date.getDate();
			month   = this.monthNames[date.getMonth()];
			dateString = dayName + ' ' +month + ' ' +day;
			return dateString;
		},
		checkDate:function(){
			var curDateStr = this.getDateStr();
			if (this.lastDate !== curDateStr){
				this.lastDate = curDateStr;
				this.appendToDom(this.dateTemplate({dateStr:curDateStr}));
			}
		},
		appendToDom:function(html){
			$('.chatstream>.messages>ul').append(html);
		},
		insertIntoDom:function(message){
			$('.chatstream>.messages>ul>li:last-child>.message>.dividerWrapper>.messageContent').append(message);
		},
		isSameUser:function(context){
			if(this.lastMessage){
				return (context.initials===this.lastMessage.initials && context.time===this.lastMessage.time)? true : false;
			}
			return false;
		},
		commitChat:function(content,hash){
			var context;
			if(hash){
				context = hash;
				context.message = new hbs.SafeString(hash.message.string);
			} else {
				var safeString = new hbs.SafeString(content);
				context = {initials:this.initials,message:safeString,time:this.getTime()};
			}
			this.checkDate();																//adds a new date header to the flow if it is different day
			if(this.isSameUser(context)){
				this.insertIntoDom("<p>"+context.message+"</p>");
			} else {
				this.appendToDom(this.msgTemplate(context));
				this.lastMessage = context;													//store the last message we displayed
			}
			$('.chatstream>.messages>ul>li:last-child>.message>button').css('background-color',this.colorDict[context.initials]);
			$(".messages ul li:last-child .dividerWrapper").animate({right:'0px',opacity:1},200);
			$(".messages").animate({ scrollTop: $('.messages ul').height() }, 200);
			if(!hash) this.socket.emit('message',context);
		},
		toggleUserControls:function(ev){
			ev.stopPropagation();
			if($('.row.app').css('right')==='0px'){
				this.showUserControls();
			} else {
				this.hideUserControls();
			}
		},
		showUserControls:function(){
			$('.row.app').animate({right:'200px'},200);
			$('.userMgmt').animate({right:'0px'},200);
			$('.row.app').on('click',this.hideUserControls);
		},
		hideUserControls:function(ev){
			if(ev) ev.stopPropagation();
			$('.row.app').animate({right:'0px'},200);
			$('.userMgmt').animate({right:'-200px'},200);
			$('.row.app').off('click',this.hideUserControls);
		}

	});

	var curtainView = new CurtainView();
	$('textarea').focus();

}(jQuery,Model,Handlebars,io,Chart));