/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

 /*
 *
 */
define(function(require) {
    'use strict';
    
	var Backbone		= require('backbone');
    var App		        = require('App');
	var XAEnums			= require('utils/XAEnums');
	var XAUtil			= require('utils/XAUtils');
	var localization	= require('utils/XALangSupport');
	var VXGroup			= require('models/VXGroup');
	require('bootstrap-editable');
    	
	var FormInputItem = Backbone.Marionette.ItemView.extend({
		_msvName : 'FormInputItem',
		template : require('hbs!tmpl/policies/GroupPermItem'),
		tagName : 'tr',
		templateHelpers : function(){
			
			return {
				permissions 	: this.accessTypes,
				policyConditions: this.policyConditions,
				isModelNew		: !this.model.has('editMode'),
				perms			: this.permsIds.length == 14 ? _.union(this.permsIds,[-1]) : this.permsIds,
			};
		},
		ui : {
			selectGroups	: '[data-js="selectGroups"]',
			selectUsers		: '[data-js="selectUsers"]',
			addPerms		: 'a[data-js="permissions"]',
			conditionsTags	: '[class=tags1]',
			delegatedAdmin	: 'input[data-js="delegatedAdmin"]'
		},
		events : {
			'click [data-action="delete"]'	: 'evDelete',
			'click td'						: 'evClickTD',
			'change [data-js="selectGroups"]': 'evSelectGroup',
			'change [data-js="selectUsers"]': 'evSelectUser',
			'change input[class="policy-conditions"]'	: 'policyCondtionChange'
		},

		initialize : function(options) {
			_.extend(this, _.pick(options, 'groupList','policyType','accessTypes','policyConditions','userList'));
			this.setupPermissionsAndConditions();
			
		},
 
		onRender : function() {
			this.setupFormForEditMode();
			
			this.createDropDown(this.ui.selectGroups, this.groupList, true);
			this.createDropDown(this.ui.selectUsers, this.userList, false);
			this.dropDownChange(this.ui.selectGroups);
			this.dropDownChange(this.ui.selectUsers);

			this.renderPerms();
			this.renderPolicyCondtion();
		},
		setupFormForEditMode : function() {
			this.accessItems = _.map(this.accessTypes, function(perm){ 
				if(!_.isUndefined(perm)) 
					return {'type':perm.label,isAllowed : false}
			});
			if(this.model.has('editMode') && this.model.get('editMode')){
				if(!_.isUndefined(this.model.get('groupName')) && !_.isNull(this.model.get('groupName'))){
					this.ui.selectGroups.val(this.model.get('groupName').split(','));
				}
				if(!_.isUndefined(this.model.get('userName')) && !_.isNull(this.model.get('userName'))){
					this.ui.selectUsers.val(this.model.get('userName').split(','));
				}
				
				if(!_.isUndefined(this.model.get('conditions'))){
					_.each(this.model.get('conditions'), function(obj){
						this.$el.find('input[data-js="'+obj.type+'"]').val(obj.value.toString())
					},this);
				}
				_.each(this.model.get('accesses'), function(p){
					if(p.isAllowed){
						this.$el.find('input[data-name="' + p.type + '"]').attr('checked', 'checked');
						_.each(this.accessItems,function(obj){ if(obj.type == p.type) obj.isAllowed=true;})
					}
				},this);
				
				if(!_.isUndefined(this.model.get('delegateAdmin')) && this.model.get('delegateAdmin')){
					this.ui.delegatedAdmin.attr('checked', 'checked');
				}
			}
		},
		setupPermissionsAndConditions : function() {
			var that = this;
			this.permsIds = [], this.conditions = {};
			//Set Permissions obj
			if( this.model.has('editMode') && this.model.get('editMode')){
				_.each(this.model.get('accesses'), function(p){
					if(p.isAllowed){
						var access = _.find(that.accessTypes,function(obj){if(obj.label == p.type) return obj});
						this.permsIds.push(access.name);
					}
					
				}, this);
				//Set PolicyCondtion Obj to show in edit mode
				_.each(this.model.get('conditions'), function(p){
					this.conditions[p.type] = p.value;
				}, this);
			}
		},
		dropDownChange : function($select){
			var that = this;
			$select.on('change',function(e){
		//		console.log(e.currentTarget.value);
				var name = ($(e.currentTarget).attr('data-js') == that.ui.selectGroups.attr('data-js')) ? 'group': 'user';
				that.checkDirtyFieldForDropDown(e);
				
				that.toggleAddButton(e);
				if(e.removed != undefined){
					var gNameArr = [];
					if(that.model.get(name+'Name') != undefined)
						gNameArr = _.without(that.model.get(name+'Name').split(','), e.removed.text);
					if(!_.isEmpty(gNameArr)){
						that.model.set(name+'Name',gNameArr.join(','));
					}else{
						that.model.unset(name+'Name');
					}
					return;
				}
				if(!_.isUndefined(e.added)){
						var nameList = _.map($(e.currentTarget).select2("data"), function(obj){return obj.text});
						that.model.set(name+'Name',nameList.toString());
				}
			});
		},
		createDropDown :function($select, list, typeGroup){
			var that = this;
			var placeholder = (typeGroup) ? 'Select Group' : 'Select User';
			var url 		= (typeGroup) ? "service/xusers/groups" : "service/xusers/users";
			if(this.model.has('editMode') && !_.isEmpty($select.val())){
				var temp = $select.val().split(",");
				_.each(temp , function(name){
					if(_.isUndefined(list.where({ name : name}))){
						var model;
						model = typeGroup ? new VXGroup({name: name}) : new VXUser({name: name});  
						model.fetch({async:false}).done(function(){
							list.add(model);
						});
					}
				});
			}
			var tags = list.map(function(m){
				return { id : m.id+"" , text : m.get('name')};
			});
			$select.select2({
				closeOnSelect : true,
				placeholder : placeholder,
			//	maximumSelectionSize : 1,
				width :'220px',
				tokenSeparators: [",", " "],
				tags : tags, 
				initSelection : function (element, callback) {
					var data = [];
					console.log(list);
					
					$(element.val().split(",")).each(function () {
						var obj = _.findWhere(tags,{text:this});
						data.push({id: obj.id, text: this})
					});
					callback(data);
				},
				createSearchChoice: function(term, data) {
				/*	if ($(data).filter(function() {
						return this.text.localeCompare(term) === 0;
					}).length === 0) {
						return {
							id : term,
							text: term
						};
					}*/
				},
				ajax: { 
					url: url,
					dataType: 'json',
					data: function (term, page) {
						return {name : term};
					},
					results: function (data, page) { 
						var results = [] , selectedVals = [];
						/*if(!_.isEmpty(that.ui.selectGroups.select2('val')))
							selectedVals = that.ui.selectGroups.select2('val');*/
						selectedVals = that.getGroupSelectdValues($select, typeGroup);
						if(data.resultSize != "0"){
							//if(data.vXGroups.length > 1){
								if(typeGroup)
									results = data.vXGroups.map(function(m, i){	return {id : m.id+"", text: m.name};	});
								else
									results = data.vXUsers.map(function(m, i){	return {id : m.id+"", text: m.name};	});
								if(!_.isEmpty(selectedVals))
									results = XAUtil.filterResultByText(results, selectedVals);
						//		console.log(results.length);
								return {results : results};
							//}
						//	results = [{id : data.vXGroups.id+"", text: data.vXGroups.name}];
						//	return {results : results};
						}
						return {results : results};
					}
				},	
				formatResult : function(result){
					return result.text;
				},
				formatSelection : function(result){
					return result.text;
				},
				formatNoMatches: function(result){
					return 'No group found.';
				}
			}).on('select2-focus', XAUtil.select2Focus);
		},
		renderPerms :function(){
			var that = this;
//			var permArr = _.pick(XAEnums.XAPermType,  XAUtil.getStormActions(this.policyType));
			this.perms =  _.map(this.accessTypes,function(m){return {text:m.label, value:m.name};});
			this.perms.push({'value' : -1, 'text' : 'Select/Deselect All'});
			this.ui.addPerms.editable({
			    emptytext : 'Add Permissions',
				source: this.perms,
				value : this.permsIds,
				display: function(values,srcData) {
					if(_.isNull(values) || _.isEmpty(values)){
						$(this).empty();
						that.model.unset('accesses');
						return;
					}
					if(_.contains(values,"-1")){
						values = _.without(values,"-1")
					}
//			    	that.checkDirtyFieldForGroup(values);
					var permTypeArr = [];
					var valArr = _.map(values, function(id){
						if(!_.isUndefined(id)){
							var obj = _.findWhere(srcData,{'value' : id});
							permTypeArr.push({permType : obj.value});
							return "<span class='label label-inverse'>" + obj.text + "</span>";
						}
					});
					var perms = []
					if(that.model.has('accesses')){
							perms = that.model.get('accesses');
					}
					_.each(that.accessTypes, function(obj) {
						if(_.contains(values, obj.name)){
							var type = obj.label
							_.each(that.accessItems, function(item){ if(item.type == type) item.isAllowed = true });
						}
					});
					// Save data to model
					
					if(!_.isEmpty(that.accessItems))
						that.model.set('accesses', that.accessItems);
					
					$(this).html(valArr.join(" "));
				},
			}).on('click', function(e) {
				e.stopPropagation();
				e.preventDefault();
				that.$('input[type="checkbox"][value="-1"]').click(function(e){
					var checkboxlist =$(this).closest('.editable-checklist').find('input[type="checkbox"][value!=-1]')
					$(this).is(':checked') ? checkboxlist.prop('checked',true) : checkboxlist.prop('checked',false); 
					
				});
			});
			
		},
		renderPolicyCondtion : function() {
			var that = this;
			if(this.policyConditions.length > 0){
				var tmpl = _.map(this.policyConditions,function(obj){ 
					return '<div class="editable-address margin-bottom-5"><label style="display:block !important;"><span>'+obj.label+' : </span></label><input type="text" name="'+obj.name+'" ></div>'
				});
				XAUtil.customXEditableForPolicyCond(tmpl.join(''));
				this.$('#policyConditions').editable({
					emptytext : 'Add Conditions',
					value : this.conditions, 
					display: function(value) {
						var continue_ = false, i = 0;
						if(!value) {
							$(this).empty();
							return; 
						} // End if
						_.each(value, function(val, name){ if(!_.isEmpty(val)) continue_ = true; });
						if(continue_){
							var html = _.map(value, function(val,name) {
								var label = (i%2 == 0) ? 'label label-inverse' : 'label';
								i++;
								return _.isEmpty(val) ? '' : '<span class="'+label+'">'+name+' : '+ val + '</span>';	
							});
							var cond = _.map(value, function(val, name) {return {'type' : name, 'value' :val};});
							that.model.set('conditions', cond);
							$(this).html(html); 
						}else{
							that.model.unset('conditions');
							$(this).empty();
						}
					} // End display option
				}); // End editable()
			}
		},
		getGroupSelectdValues : function($select, typeGroup){
			var vals = [],selectedVals = [];
			var name = typeGroup ? 'group' : 'user';
			this.collection.each(function(m){
				if(!_.isUndefined(m.get(name+'Name')) && !_.isNull(m.get(name+'Name'))){
					vals.push.apply(vals, m.get(name+'Name').split(','));
				}
			});
			if(!_.isEmpty($select.select2('val')))
				selectedVals = $select.select2('val');
			vals.push.apply(vals , selectedVals);
			vals = $.unique(vals);
			return vals;
		},
		evDelete : function(){
			var that = this;
			this.collection.remove(this.model);
			this.toggleAddButton();
		},
		evClickTD : function(e){
			var $el = $(e.currentTarget);
			//Set Delegated Admin value 
			if(!_.isUndefined($el.find('input').data('js'))){
				this.model.set('delegateAdmin',$el.find('input').is(':checked'))
				return;
			}
		},
		checkDirtyFieldForCheckBox : function(perms){
			var permList = [];
			if(!_.isUndefined(this.model.get('_vPermList')))
				permList = _.map(this.model.attributes._vPermList,function(obj){return obj.permType;});
			perms = _.map(perms,function(obj){return obj.permType;});
			XAUtil.checkDirtyField(permList, perms, this.$el);
		},
		toggleAddButton : function(e){
			var temp = [];
			this.collection.each(function(m){
				if(!_.isUndefined(m.get('groupId'))){
					temp.push.apply(temp, m.get('groupId').split(','));
					
				}
			});
			if(!_.isUndefined(e)){
				if( !_.isUndefined(e.added) && ((temp.length + 1) == this.groupList.length)) 
					$('[data-action="addGroup"]').hide();
				if(!_.isUndefined(e.removed))
					$('[data-action="addGroup"]').show();
			}else{
				$('[data-action="addGroup"]').show();
			}
		},
		policyCondtionChange :function(e){
			if(!_.isEmpty($(e.currentTarget).val()) && !_.isEmpty(this.policyConditions)){
				var policyCond = { 'type' : $(e.currentTarget).attr('data-js'), 'value' : $(e.currentTarget).val() } ;
				var conditions = [];
				if(this.model.has('conditions')){
					conditions = this.model.get('conditions')
				}
				conditions.push(policyCond);
				this.model.set('conditions',conditions);
			}
				
		},
		checkDirtyFieldForDropDown : function(e){
			//that.model.has('groupId')
			var groupIdList =[];
			if(!_.isUndefined(this.model.get('groupId')))
				groupIdList = this.model.get('groupId').split(',');
			XAUtil.checkDirtyField(groupIdList, e.val, $(e.currentTarget));
		},
	});



	return Backbone.Marionette.CompositeView.extend({
		_msvName : 'FormInputItemList',
		template : require('hbs!tmpl/policies/GroupPermList'),
		//tagName : 'ul', 
		//className : 'timeline-container',
		templateHelpers :function(){
			return {
				permHeaders : this.getPermHeaders()
			};
		},
		getItemView : function(item){
			if(!item){
				return;
			}
			return FormInputItem;
		},
		itemViewContainer : ".js-formInput",
		itemViewOptions : function() {
			return {
				'collection' 	: this.collection,
				'groupList' 	: this.groupList,
				'userList' 	: this.userList,
				'policyType'	: this.policyType,
				'accessTypes'	: this.accessTypes,
				'policyConditions' : this.rangerServiceDefModel.get('policyConditions')
			};
		},
		events : {
			'click [data-action="addGroup"]' : 'addNew'
		},
		initialize : function(options) {
			_.extend(this, _.pick(options, 'groupList','policyType','accessTypes','rangerServiceDefModel','userList'));
			//this.hiveGroupPerm = _.has(options,'hiveGroupPerm') ? true : false;
			this.listenTo(this.groupList, 'sync', this.render, this);
			if(this.collection.length == 0)
				this.collection.add(new Backbone.Model());
		},
		onRender : function(){
			//console.log("onRender of ArtifactFormNoteList called");
			this.toggleAddButton();
		},
		addNew : function(){
			var that =this;
			if(this.groupList.length > this.collection.length){
				this.collection.add(new Backbone.Model());
				this.toggleAddButton();
			}
		},
		toggleAddButton : function(){
			var groupIds=[];
			this.collection.each(function(m){
				if(!_.isUndefined(m.get('groupId'))){
					var temp = m.get('groupId').split(',');
					groupIds.push.apply(groupIds,temp);
				}
			});
			if(groupIds.length == this.groupList.length)
				this.$('button[data-action="addGroup"]').hide();
			else
				this.$('button[data-action="addGroup"]').show();
		},
		getPermHeaders : function(){
			var permList = [];//_.map(this.accessTypes,function(type){ return type.label});
			
			permList.unshift(localization.tt('lbl.delegatedAdmin'));
			permList.unshift(localization.tt('lbl.permissions'));
			if(!_.isEmpty(this.rangerServiceDefModel.get('policyConditions'))){
				permList.unshift(localization.tt('h.policyCondition'));
			}
			permList.unshift(localization.tt('lbl.selectUser'));
			permList.unshift(localization.tt('lbl.selectGroup'));
			permList.push("");
			return permList;
		},
	});

});