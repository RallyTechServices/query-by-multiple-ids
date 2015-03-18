Ext.define('Rally.technicalservices.plugin.GridControlShowable', {
    /**
     * @cfg {String}
     * header position to add control to (left|right)
     */
    headerPosition: 'right',

    /**
     * @cfg {Boolean}
     * true to show control when in grid mode.
     */
    showInGridMode: true,

    /**
     * Override to configure control component to add to GridBoard.
     *
     * @template
     * @return {Object|Ext.Component|false} return component config or component to add to control header or return false to add nothing.
     */
    getControlCmpConfig: function() {
        return false;
    },

    /**
     * Override to configure where the control component should be inserted in the control header
     *
     * @template
     * @return {Number|false} return insert position of control component or return false to add control in order.
     */
    getControlInsertPosition: function() {
        return false;
    },

    /**
     * Returns the control component;
     *
     * @returns {Ext.Component}
     */
    getControlCmp: function() {
        return this.controlCmp;
    },

    /**
     * Initializes and shows the control component in the header.
     */
    showControl: function() {
        return this._showOrHideControl();
    },

    _getControlCt: function() {
        return this.cmp.componentBox;
    },

    _showOrHideControl: function() {

        if (!this.controlCmp) {
            this._createControlCmp();
        }

        if (this.controlCmp) {
            this.controlCmp.show();
        }

        return this.controlCmp;
    },

    _createControlCmp: function() {
        var controlCmpConfig = this.getControlCmpConfig();

        if (controlCmpConfig) {
            if (!Ext.isFunction(controlCmpConfig.hide)) {
                controlCmpConfig.hidden = true;
                controlCmpConfig.style = Ext.merge({'float': this.headerPosition}, controlCmpConfig.style);
            }
            controlCmpConfig['margin'] = '20 10 10 10';

            var insertPosition = this.getControlInsertPosition();
            if (Ext.isNumber(insertPosition)) {
                this.controlCmp = this._getControlCt().insert(insertPosition, controlCmpConfig);
            } else {
                this.controlCmp = this._getControlCt().add(controlCmpConfig);
            }
        }
    }
});

Ext.define('Rally.technicalservices.plugin.GridBoardFieldPicker', {
    alias: 'plugin.tsfieldpicker',
    mixins: ['Rally.technicalservices.plugin.GridControlShowable'],
    extend:'Ext.AbstractPlugin',
    requires: [
        'Rally.ui.popover.Popover',
        'Rally.ui.Button',
        'Rally.ui.picker.FieldPicker'
    ],

    /**
     * @cfg {String[]} alwaysSelectedFields
     * The fields that will be always selected in the field picker for the grid view
     */
    gridAlwaysSelectedValues: ['FormattedID', 'Name'], // DragAndDropRank gets added in init if Drag and Drop is enabled for the workspace in the component's context

     /**
     * @cfg {String[]} gridFieldBlackList
     * The fields that will be blacklisted in grid mode
     */
    gridFieldBlackList: [
        'Actuals',
        'Changesets',
        'Children',
        'Description',
        'Notes',
        'ObjectID',
        'Predecessors',
        'RevisionHistory',
        'Subscription',
        'Successors',
        'TaskIndex',
        'Workspace',
        'VersionId'
    ],
    /**
     * @cfg {String[]}
     * the names of the models displayed on the board.
     */
    modelNames: [],

    stateful: true,
    stateId: 'fieldpicker',

    margin: '3 9 0 0',

    constructor: function (config) {
        config.gridFieldBlackList = _.union(this.gridFieldBlackList, config.gridFieldBlackList);
        config.gridAlwaysSelectedValues = _.union(this.gridAlwaysSelectedValues, config.gridAlwaysSelectedValues);
        this.callParent(arguments);
    },

    init: function(cmp) {
        this.callParent(arguments);
        this.cmp = cmp;

        var rankingEnabled = false; //this.getContext().getWorkspace().WorkspaceConfiguration.DragDropRankingEnabled && cmp.gridConfig.enableRanking !== false;

        this.gridAlwaysSelectedValues = this._modifyFieldCollection(this.gridAlwaysSelectedValues, ['DragAndDropRank'], rankingEnabled);
        this.gridFieldBlackList = this._modifyFieldCollection(this.gridFieldBlackList, ['DragAndDropRank'], !rankingEnabled);
        this.stateId = this.stateId || this.cmp.getContext().getScopedStateId('shownfields');
        this.cmp.mon(this.cmp, 'toggle', this._onToggled, this);

        var state = Ext.state.Manager.get(this.stateId);
        this._fields = state && state.fields || [];
        // modify the board config of the gridboard
        //var cardboardConfig = this.cmp.cardBoardConfig;
        //if (!cardboardConfig.columnConfig) {
        //    cardboardConfig.columnConfig = {};
        //}
        //cardboardConfig.columnConfig.fields = this._fields;

        this.showControl();
    },

    _modifyFieldCollection: function (collection, fields, include) {
        if (include) {
            return _.union(collection, fields);
        }
        return _.reject(collection, function (field) { return _.contains(fields, field); });
    },

    getControlCmpConfig: function() {
        return {
            xtype: "rallybutton",
            itemId: 'fieldpickerbtn',
            cls: 'field-picker-btn secondary rly-small',
            margin: this.margin,
            iconCls: 'icon-add-column',
            toolTipConfig: {
                html: this.getTitle(),
                anchor: 'top'
            },
            listeners: {
                click: this._onClick,
                scope: this
            }
        };
    },

    _onClick: function(btn) {
        this._createPopover(btn.getEl());
    },

    _getPickerConfig: function() {
        var pickerConfig;

        pickerConfig = _.extend({
            value: _.pluck(this.cmp.columns, 'dataIndex').join(','),
            fieldBlackList: this.gridFieldBlackList,
            alwaysSelectedValues: this.gridAlwaysSelectedValues
        }, this.fieldPickerConfig);

        return pickerConfig;
    },

    _createPopover: function(popoverTarget) {
        this.popover = Ext.create('Rally.ui.popover.Popover', {
            target: popoverTarget,
            placement: ['bottom', 'left', 'top', 'right'],
            cls: 'field-picker-popover',
            toFront: Ext.emptyFn,
            buttonAlign: 'center',
            title: this.getTitle(),
            listeners: {
                destroy: function () {
                    this.popover = null;
                },
                scope: this
            },
            buttons: [
                {
                    xtype: "rallybutton",
                    text: 'Apply',
                    cls: 'field-picker-apply-btn primary rly-small',
                    listeners: {
                        click: function() {
                            this._onApply(this.popover);
                        },
                        scope: this
                    }
                },
                {
                    xtype: "rallybutton",
                    text: 'Cancel',
                    cls: 'field-picker-cancel-btn secondary dark rly-small',
                    listeners: {
                        click: function() {
                            this.popover.close();
                        },
                        scope: this
                    }
                }
            ],
            items: [
                _.extend({
                    xtype: 'rallyfieldpicker',
                    cls: 'field-picker',
                    itemId: 'fieldpicker',
                    modelTypes: this._getModelTypes(),
                    alwaysExpanded: true,
                    width: 200,
                    placeholderText: 'Search',
                    selectedTextLabel: 'Selected',
                    availableTextLabel: 'Available',
                    listeners: {
                        specialkey: function(field, e) {
                            if (e.getKey() === e.ESC) {
                                this.popover.close();
                            }
                        },
                        scope: this
                    }
                }, this._getPickerConfig())
            ]
        });
    },

    _getModelTypes: function() {
        return _.pluck(this._getModels(), 'typePath');
    },

    _getModels: function() {
        return _.reduce(this.cmp.getModels(), function(accum, model) {
            if (model.typePath === 'artifact') {
                accum = accum.concat(model.getArtifactComponentModels());
            } else {
                accum.push(model);
            }
            return accum;
        }, []);
    },

    _onToggled: function () {
        if (this.popover && this.popover.rendered) {
            this.down('#popoverheader').setTitle(this.getTitle());
        }
        this.cmp.down('#fieldpickerbtn').setToolTipText(this.getTitle());
    },

    getTitle: function () {
        return 'Show Columns';
    },

    /**
     * Update the fields displayed. In grid mode this will be the columns displayed. In board mode it will be
     * the fields on the cards
     *
     * @param {String[]|Object[]} fields A list of field names to display
     * @param {Boolean} true to suspend store load if it will be triggered elsewhere
     */
    updateFields: function (fields, suspendLoad) {
        this._fields = fields;

        var gridOrBoard = this.cmp;
            gridOrBoard.reconfigureWithColumns(fields);


         this._updatePickerValue(fields);
    },

    _updatePickerValue: function(fields) {
        if (this.popover && this.popover.down('rallyfieldpicker')) {
            this.popover.down('rallyfieldpicker').setValue(this._fields.join(','));
        }
    },

    _onApply: function(popover) {
        var fieldPicker = popover.down('rallyfieldpicker'),
            fields = _.map(fieldPicker.getValue(), function (field) {
                return field.get('name');
            });

        this.updateFields(fields);

        popover.close();
    }
});
