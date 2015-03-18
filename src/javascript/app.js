Ext.define("query-by-multiple-id", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'control_box',layout:{type:'hbox'}},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._addQueryBox();
     },
     _addQueryBox: function(){
         this.down('#control_box').add({
             xtype: 'textareafield',
             itemId: 'ta-ids',
             fieldLabel: 'Find FormattedIDs:',
             labelAlign: 'top',
             margin: 0
         });
         this.down('#control_box').add({
             xtype: 'rallybutton',
             scope: this,
             text: 'Go',
             margin: '20 10 10 10',
             handler: this._go
         });
     },
    _go: function(){
        var queryId = this.down('#ta-ids').getValue();
        var ids = queryId.split( /\r?\n|\r/g);
        this.logger.log('go', ids);
        this._buildGrid(ids);
    },

    _buildGrid: function(ids){

        var filters = [];
        Ext.each(ids, function(fid){
            filters.push({
                property: 'FormattedID',
                value: fid
            })
        });
        filters = Rally.data.wsapi.Filter.or(filters);

        if (this.down('rallygrid')){
            this.down('rallygrid').destroy();
        }

        var cmpControl = this.down('#control_box');
        this.down('#display_box').add({
            xtype: 'rallygrid',
            context: this.getContext(),
            componentBox: cmpControl,
            enableBulkEdit: true,
            plugins: [{
                ptype: 'tsfieldpicker',
                headerPosition: 'left',
                modelNames: ['PortfolioItem/Feature'],
                stateful: true,
                stateId: this.getContext().getScopedStateId('columns')
            }],
            storeConfig: {
                model: 'PortfolioItem/Feature',
                context: {project: null},
                filters: filters
            },
            columnCfgs: [
                'FormattedID',
                'Name'
            ]
        });
    }
});
