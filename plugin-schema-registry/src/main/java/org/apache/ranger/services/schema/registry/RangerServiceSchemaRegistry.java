/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.ranger.services.schema.registry;

import org.apache.ranger.services.schema.registry.client.RangerRegistryClient;
import org.apache.ranger.services.schema.registry.client.SchemaRegistryConnectionMgr;
import org.apache.ranger.services.schema.registry.client.SchemaRegistryResourceMgr;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.ranger.plugin.model.RangerService;
import org.apache.ranger.plugin.model.RangerServiceDef;
import org.apache.ranger.plugin.service.RangerBaseService;
import org.apache.ranger.plugin.service.ResourceLookupContext;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class RangerServiceSchemaRegistry extends RangerBaseService {

    private static final Log LOG = LogFactory.getLog(RangerServiceSchemaRegistry.class);


    @Override
    public void init(RangerServiceDef serviceDef, RangerService service) {
        super.init(serviceDef, service);
    }

    @Override
    public HashMap<String, Object> validateConfig() {
        HashMap<String, Object> ret = new HashMap<String, Object>();

        if (LOG.isDebugEnabled()) {
            LOG.debug("==> RangerServiceSchemaRegistry.validateConfig(" + serviceName + ")");
        }

        if (configs != null) {
            try {
                ret = SchemaRegistryConnectionMgr.connectionTest(serviceName, configs);
            } catch (Exception e) {
                LOG.error("<== RangerServiceSchemaRegistry.validateConfig Error:" + e);
                throw e;
            }
        }

        if (LOG.isDebugEnabled()) {
            LOG.debug("<== RangerServiceSchemaRegistry.validateConfig(" + serviceName + "): ret=" + ret);
        }

        return ret;
    }

    @Override
    public List<String> lookupResource(ResourceLookupContext context) throws Exception {
        List<String> ret = new ArrayList<String>();

        if (LOG.isDebugEnabled()) {
            LOG.debug("==> RangerServiceSchemaRegistry.lookupResource(" + serviceName + ")");
        }

        if (configs != null) {
            final RangerRegistryClient registryClient = SchemaRegistryConnectionMgr.getSchemaRegistryClient(serviceName, configs);
            ret = SchemaRegistryResourceMgr.getSchemaRegistryResources(serviceName, configs, context, registryClient);
        }

        if (LOG.isDebugEnabled()) {
            LOG.debug("<== RangerServiceSchemaRegistry.lookupResource(" + serviceName + "): ret=" + ret);
        }

        return ret;
    }

}
