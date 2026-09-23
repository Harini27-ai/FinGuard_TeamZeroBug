class GraphService:
    # Neo4j adapter with a local fallback for demo environments.
    def __init__(self, uri="", user="", password=""):
        self.driver = None
        if uri:
            try:
                from neo4j import GraphDatabase
                self.driver = GraphDatabase.driver(uri, auth=(user, password))
            except Exception:
                self.driver = None

    def close(self):
        if self.driver:
            self.driver.close()

    def upsert_transaction(self, account_id, device_id, ip, amount):
        if not self.driver:
            return
        query = '''
        MERGE (a:Account {id:$account_id})
        MERGE (d:Device {id:$device_id})
        MERGE (i:IP {value:$ip})
        MERGE (a)-[:USED_DEVICE]->(d)
        MERGE (a)-[:USED_IP]->(i)
        CREATE (t:Transaction {id:randomUUID(), amount:$amount, ts:datetime()})
        CREATE (a)-[:MADE]->(t)
        '''
        try:
            with self.driver.session() as session:
                session.run(query, account_id=account_id, device_id=device_id, ip=ip, amount=amount)
        except Exception:
            pass

    def relationship_score(self, account_id, device_id, ip):
        if not self.driver:
            return 0.0, []
        query = '''
        MATCH (a:Account {id:$account_id})
        OPTIONAL MATCH (a)-[:USED_DEVICE]->(d:Device)<-[:USED_DEVICE]-(other:Account)
        OPTIONAL MATCH (a)-[:USED_IP]->(i:IP)<-[:USED_IP]-(otherIp:Account)
        RETURN count(DISTINCT other) AS device_accounts,
               count(DISTINCT otherIp) AS ip_accounts
        '''
        try:
            with self.driver.session() as session:
                row = session.run(query, account_id=account_id).single()
                da = row["device_accounts"] if row else 0
                ia = row["ip_accounts"] if row else 0
                score = min(0.75, max(0, da-1)*0.20 + max(0, ia-1)*0.15)
                reasons = []
                if da > 2:
                    reasons.append("Device is shared across multiple accounts")
                if ia > 2:
                    reasons.append("IP is associated with multiple accounts")
                return score, reasons
        except Exception:
            return 0.0, []
