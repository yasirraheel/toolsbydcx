export const ccnaQuestions = [
  {
    "id": 1,
    "questionNo": "Question #22",
    "question": "Which technology is appropriate for communication between an SDN controller and applications running over the network? (Choose one answer)",
    "options": [
      "A. NETCONF",
      "B. OpenFlow",
      "C. REST API",
      "D. Southbound API"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 2,
    "questionNo": "Question #5",
    "question": "What is the purpose of classifying network traffic in QoS? (Choose one answer)",
    "options": [
      "A. writes the class identifier of a packet to a dedicated field in the packet header",
      "B. configures traffic-matching rules on network devices",
      "C. services traffic according to its class",
      "D. identifies the type of traffic that will receive a particular treatment"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 3,
    "questionNo": "Question #48",
    "question": "What is a characteristic of cloud-based network topology? (Choose one answer)",
    "options": [
      "A. physical workstations are configured to share resources",
      "B. onsite network services are provided with physical Layer 2 and Layer 3 components",
      "C. wireless connections provide the sole access method to services",
      "D. services are provided by a public, private, or hybrid deployment"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 4,
    "questionNo": "Question #3",
    "question": "What is the difference between the TCP and UDP protocols? (Choose one answer)",
    "options": [
      "A. TCP identifies devices by their MAC addresses, and UDP identifies devices by their IP address.",
      "B. TCP ensures ordered, reliable data delivery, and UDP offers low latency and high throughput.",
      "C. TCP manages multicast and broadcast data transfers, and UDP only handles unicast communications.",
      "D. TCP discovers neighboring devices on a local network segment, and UDP prevents Layer 2 switching loops."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 5,
    "questionNo": "Question #10",
    "question": "Which interface condition is occurring in this output? (Choose one answer)",
    "options": [
      "A. duplex mismatch",
      "B. queueing",
      "C. high throughput",
      "D. bad NIC"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": "Router# show interfaces GigabitEthernet0/1\nGigabitEthernet0/1 is up, line protocol is up\n  Hardware is Gigabit Ethernet, address is 000c.29eb.1234 (bia 000c.29eb.1234)\n  Internet address is 10.1.1.1/24\n  MTU 1500 bytes, BW 100000 Kbit/sec, DLY 100 usec,\n     reliability 255/255, txload 1/255, rxload 1/255\n  Encapsulation ARPA, loopback not set\n  Keepalive set (10 sec)\n  Half-duplex, 100Mb/s, media type is RJ45\n  output flow-control is unsupported, input flow-control is unsupported\n  ARP type: ARPA, ARP Timeout 04:00:00\n  Last input 00:00:02, output 00:00:01, output hang never\n  Last clearing of \"show interface\" counters never\n  Input queue: 0/75/0/0 (size/max/drops/flushes); Total output drops: 0\n  Queueing strategy: fifo\n  Output queue: 0/40 (size/max)\n  5 minute input rate 1000 bits/sec, 2 packets/sec\n  5 minute output rate 2000 bits/sec, 3 packets/sec\n     145823 packets input, 10245892 bytes, 0 no buffer\n     Received 412 broadcasts (0 IP multicasts)\n     0 runts, 0 giants, 0 throttles\n     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored\n     0 watchdog, 0 multicast, 0 pause input\n     185291 packets output, 15478923 bytes, 0 underruns\n     0 output errors, 8421 collisions, 2 interface resets\n     8421 late collisions, 2415 deferred, 0 lost carrier, 0 no carrier",
    "exhibitImage": null
  },
  {
    "id": 6,
    "questionNo": "Question #15",
    "question": "What is the main difference between traditional networks and controller-based networking? (Choose one answer)",
    "options": [
      "A. Controller-based networks are a closed ecosystem, and traditional networks take advantage of programmability.",
      "B. Controller-based networks increase Total Cost of Ownership for the company, and traditional networks require less investment.",
      "C. Controller-based networks provide a framework for innovation, and traditional networks create efficiency.",
      "D. Controller-based networks are open for application requests, and traditional networks operate manually."
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 7,
    "questionNo": "Question #49",
    "question": "Which two HTTP verbs does a REST-based API call to create a resource? (Choose two answers)",
    "options": [
      "A. DELETE",
      "B. GET",
      "C. PUT",
      "D. POST",
      "E. PATCH"
    ],
    "correctOption": [
      2,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 8,
    "questionNo": "Question #4",
    "question": "What is a service that is provided by a wireless controller? (Choose one answer)",
    "options": [
      "A. It manages interference in a dense network",
      "B. It provides Layer 3 routing between wired and wireless devices.",
      "C. It mitigates threats from the internet.",
      "D. It issues IP addresses to wired devices."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 9,
    "questionNo": "Question #13",
    "question": "Which AP mode provides a wireless connection between two network segments? (Choose one answer)",
    "options": [
      "A. local",
      "B. bridge",
      "C. root",
      "D. FlexConnect"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 10,
    "questionNo": "Question #30",
    "question": "What is a characteristic of an SSID in wireless networks? (Choose one answer)",
    "options": [
      "A. eliminates network piggybacking",
      "B. requires the use of PoE functionality",
      "C. identifies a wireless network",
      "D. allows easy file sharing between endpoints"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 11,
    "questionNo": "Question #32",
    "question": "What is the function of the controller in a software-defined network? (Choose one answer)",
    "options": [
      "A. multicast replication at the hardware level",
      "B. making routing decisions",
      "C. forwarding packets",
      "D. fragmenting and reassembling packets"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 12,
    "questionNo": "Question #40",
    "question": "When deploying a new network that includes both Cisco and third-party network devices, which redundancy protocol avoids the interruption of network traffic if the default gateway router fails? (Choose one answer)",
    "options": [
      "A. FHRP",
      "B. HSRP",
      "C. VRRP",
      "D. GLBP"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 13,
    "questionNo": "Question #47",
    "question": "Which Cisco proprietary protocol ensures traffic recovers automatically when the active gateway fails? (Choose one answer)",
    "options": [
      "A. VRRP",
      "B. FHRP",
      "C. SLB",
      "D. HSRP"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 14,
    "questionNo": "Question #1",
    "question": "Which IPsec mode provides encapsulation and encryption of the entire original IP packet on a site-to-site VPN? (Choose one answer)",
    "options": [
      "A. aggressive",
      "B. tunnel",
      "C. transport",
      "D. main"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 15,
    "questionNo": "Question #11",
    "question": "An abnormally high number of syslog messages are generated by a device with the debug process turned on. Which action prevents debug messages from being sent via syslog while allowing other messages? (Choose one answer)",
    "options": [
      "A. Turn off the logging monitor in global configuration mode.",
      "B. Disable logging to the console.",
      "C. Set the logging trap severity level to informational.",
      "D. Use an access list to filter out the syslog messages."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 16,
    "questionNo": "Question #17",
    "question": "How is AI used to identify issues within network traffic? (Choose one answer)",
    "options": [
      "A. It exclusively predicts device malfunctions.",
      "B. It makes ethical judgments on private data surveillance.",
      "C. It guarantees zero packet loss in the network.",
      "D. It analyzes patterns for anomaly detection."
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 17,
    "questionNo": "Question #14",
    "question": "Which technology allows multiple operating systems to run on a single physical server? (Choose one answer)",
    "options": [
      "A. virtualization",
      "B. application hosting",
      "C. cloud computing",
      "D. containers"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 18,
    "questionNo": "Question #18",
    "question": "How does WPA3 improve security? (Choose one answer)",
    "options": [
      "A. It uses RC4 for encryption.",
      "B. It uses SAE for authentication.",
      "C. It uses TKIP for encryption.",
      "D. It uses a 4-way handshake for authentication."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 19,
    "questionNo": "Question #19",
    "question": "In which ways does a spine-and-leaf architecture allow for scalability in a network when additional access ports are required? (Choose one answer)",
    "options": [
      "A. A leaf switch is added with connections to every spine switch.",
      "B. A leaf switch is added with a single connection to a core spine switch.",
      "C. A spine switch is added with at least 40 GB uplinks.",
      "D. A spine switch and a leaf switch are added with redundant connections between them."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 20,
    "questionNo": "Question #7",
    "question": "How does machine learning strengthen the security measures of the network? (Choose one answer)",
    "options": [
      "A. It enforces password complexity requirements.",
      "B. It controls VPN access permissions.",
      "C. It manages firewall rule sets.",
      "D. It improves real-time threat detection."
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 21,
    "questionNo": "Question #21",
    "question": "Refer to the exhibit. A network engineer is configuring a WLAN to use a WPA2 PSK and allow only specific clients to join. Which two actions must be taken to complete the process? (Choose two answers)",
    "options": [
      "A. Enable the OSEN Policy option.",
      "B. Enable the MAC Filtering option.",
      "C. Enable the 802.1X option for Authentication Key Management.",
      "D. Enable the CCKM option for Authentication Key Management.",
      "E. Enable the WPA2 Policy option."
    ],
    "correctOption": [
      1,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/21.png"
  },
  {
    "id": 22,
    "questionNo": "Question #36",
    "question": "What is the primary purpose of a console port on a Cisco WLC? (Choose one answer)",
    "options": [
      "A. in-band management via an IP transport",
      "B. out-of-band management via an asynchronous transport",
      "C. out-of-band management via an IP transport",
      "D. in-band management via an asynchronous transport"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 23,
    "questionNo": "Question #31",
    "question": "Refer to the exhibit. The Wi-Fi SSID \"Office_WLAN\" has Layer 2 Security configured with MAC filtering enabled. What additional security is provided by this specific feature? (Choose one answer)",
    "options": [
      "A. There is an extra layer of security that ensures only authorized devices with known MAC addresses connect to the network.",
      "B. There is Galois cache algorithm configured that provides strong encryption and authentication.",
      "C. There is a strong mutual authentication used between NAC and the network devices using x.509 standard.",
      "D. All data frames exchanged between the client and the access point are encrypted."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/31.png"
  },
  {
    "id": 24,
    "questionNo": "Question #37",
    "question": "Which authentication method requires the user to provide a physical attribute to authenticate successfully? (Choose one answer)",
    "options": [
      "A. multifactor",
      "B. biometric",
      "C. password",
      "D. certificate"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 25,
    "questionNo": "Question #45",
    "question": "What are two benefits of controller-based networking? (Choose two answers)",
    "options": [
      "A. provides centralization of key IT functions",
      "B. allows for fewer network failures",
      "C. inflates software costs",
      "D. increases network bandwidth usage",
      "E. reduces network configuration complexity"
    ],
    "correctOption": [
      0,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 26,
    "questionNo": "Question #8",
    "question": "How do AAA operations compare regarding user identification, user services, and access control? (Choose one answer)",
    "options": [
      "A. Authentication identifies users, and accounting tracks user services.",
      "B. Authentication enforces resource access and accounting identifies a user's credentials.",
      "C. Authentication manages user permissions, and authorization monitors user activities.",
      "D. Authentication records user activities, and accounting validates user credentials."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 27,
    "questionNo": "Question #12",
    "question": "A new user account must meet the following requirements:\n* It must be configured in the local database.\n* The username is engineer2.\n* It must use the strongest password configurable.\n\nWhich command must be configured? (Choose one answer)",
    "options": [
      "A. username engineer2 privilege 1 password 7 test2021",
      "B. username engineer2 algorithm-type scrypt secret test2021",
      "C. username engineer2 secret 5 password $1$b1u$KZbs1Pyh4QzwXyZ",
      "D. username engineer2 secret 4 $1$b1u$KZbs1Pyh4QzwXyZ"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 28,
    "questionNo": "Question #16",
    "question": "Refer to the exhibit. Site A was recently connected to site B over a new single-mode fiber path. Users at site A report intermittent connectivity issues with applications hosted at site B. What is the reason for the problem? (Choose one answer)",
    "options": [
      "A. The wrong cable type was used to make the connection.",
      "B. An incorrect type of transceiver has been inserted into a device on the link.",
      "C. Heavy usage is causing high latency.",
      "D. Physical network errors are being transmitted between the two sites."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/16.png"
  },
  {
    "id": 29,
    "questionNo": "Question #25",
    "question": "What is the function of a DNS zone transfer? (Choose one answer)",
    "options": [
      "A. Transfer domain registration from one registrar to another.",
      "B. Modify DNS resource records for load balancing.",
      "C. Copy DNS database files from a primary to secondary server.",
      "D. Redirect traffic from one domain to another."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 30,
    "questionNo": "Question #38",
    "question": "Which file transfer protocol omits a username or password requirement and acknowledges all data sent? (Choose one answer)",
    "options": [
      "A. TFTP",
      "B. SCP",
      "C. SFTP",
      "D. FTP"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 31,
    "questionNo": "Question #39",
    "question": "Refer to the exhibit. Which configuration for RTR-1 denies SSH access from PC-1 to any RTR-1 interface and allows all other traffic? (Choose one answer)",
    "options": [
      "A. access-list 100 deny tcp host 172.16.1.33 any eq 22\naccess-list 100 permit ip any any\nline vty 0 15\n access-class 100 in",
      "B. access-list 100 deny tcp host 172.16.1.33 any eq 23\naccess-list 100 permit ip any any\nline vty 0 15\n access-class 100 in",
      "C. access-list 100 deny tcp host 172.16.1.33 any eq 22\naccess-list 100 permit ip any any\ninterface GigabitEthernet0/0\n ip access-group 100 in",
      "D. access-list 100 deny tcp host 172.16.1.33 any eq 23\naccess-list 100 permit ip any any\ninterface GigabitEthernet0/0\n ip access-group 100 in"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/39.png"
  },
  {
    "id": 32,
    "questionNo": "Question #43",
    "question": "Refer to the exhibit. What does apple represent within the JSON data? (Choose one answer)",
    "options": [
      "A. object",
      "B. string",
      "C. key",
      "D. number"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/43.png"
  },
  {
    "id": 33,
    "questionNo": "Question #26",
    "question": "What are two recommendations for protecting network ports from being exploited when located in an office space outside of an IT closet? (Choose two answers)",
    "options": [
      "A. configure static ARP entries",
      "B. configure ports to fixed speed",
      "C. shut down unused ports",
      "D. implement port-based authentication",
      "E. enable the PortFast feature on ports"
    ],
    "correctOption": [
      2,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 34,
    "questionNo": "Question #42",
    "question": "Configure a factory-default router with these three passwords:\n\nThe user EXEC password for console access is p4ssw0rd1.\nThe user EXEC password for Telnet access is s3cr3t2.\nThe password for privileged EXEC mode is priv4t3p4ss.\n\nWhich command sequence must the engineer configure? (Choose one answer)",
    "options": [
      "A. enable secret priv4t3p4ss\nline con 0\n password p4ssw0rd1\nline vty 0 15\n password s3cr3t2",
      "B. enable secret priv4t3p4ss\nline con 0\n password p4ssw0rd1\nline vty 0 15\n password s3cr3t2\n login",
      "C. enable secret privilege 15 priv4t3p4ss\nline con 0\n password p4ssw0rd1\n login\nline vty 0 15\n password s3cr3t2\n login",
      "D. enable secret priv4t3p4ss\nline con 0\n password p4ssw0rd1\n login\nline vty 0 15\n password s3cr3t2\n login"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 35,
    "questionNo": "Question #2",
    "question": "Refer to the exhibit. The static routes were implemented on the border router. What is the next hop IP address for a ping sent to 172.16.153.154 from the border router? (Choose one answer)",
    "options": [
      "A. 10.56.22.23",
      "B. 10.65.34.19",
      "C. 10.35.47.17",
      "D. 10.12.13.14"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/2.png"
  },
  {
    "id": 36,
    "questionNo": "Question #24",
    "question": "In what way does a network supervisor reduce maintenance costs while maintaining network integrity on a traditionally managed network? (Choose one answer)",
    "options": [
      "A. They automate change-management processes that verify issue resolution.",
      "B. They use automation to centralize network-management tasks.",
      "C. They employ additional network administrators to proactively manage the network.",
      "D. They limit the use of diagnostic tools to only critical situations."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 37,
    "questionNo": "Question #23",
    "question": "Refer to the exhibit. HQ C needs to use a configuration that:\nhandles up to 150,000 concurrent connections\nminimizes consumption of public IP addresses\n\nWhich configuration meets the requirements? (Choose one answer)",
    "options": [
      "A. ip pool NATPOOL 209.165.201.1 209.165.201.5 netmask 255.255.255.248\nip nat inside source list HQC interface GigabitEthernet0/0 overload",
      "B. ip pool NATPOOL 209.165.200.225 209.165.200.226 netmask 255.255.255.252\nip nat outside source list HQC pool NATPOOL overload",
      "C. ip nat pool NATPOOL 209.165.201.1 209.165.201.248 netmask 255.255.255.248\nip nat outside source list HQC pool NATPOOL overload",
      "D. ip nat pool NATPOOL 209.165.201.1 209.165.201.3 netmask 255.255.255.248\nip nat inside source list HQC pool NATPOOL overload"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/23.png"
  },
  {
    "id": 38,
    "questionNo": "Question #41",
    "question": "Refer to the exhibit. The route for 10.227.150.160/27 has been very stable. The same route has four backups to routers A, B, C, and D via the respective methods. The routing protocol defaults for router Y have not been changed. When the current route for 10.227.150.160/27 becomes unavailable, which router will router Y use to route traffic to 10.227.150.160/27? (Choose one answer)",
    "options": [
      "A. router C",
      "B. router D",
      "C. router A",
      "D. router B"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/41.png"
  },
  {
    "id": 39,
    "questionNo": "Question #46",
    "question": "Refer to the exhibit. An engineer is using the Cisco WLC GUI to configure a WLAN for WPA2 encryption with AES and preshared key Cisco123456. After the engineer selects the WPA + WPA2 option from the Layer 2 Security drop-down list, which two tasks must they perform to complete the process? (Choose two answers)",
    "options": [
      "A. Select CCKM from the Auth Key Mgmt drop-down list, set the PSK Format to Hex, and enter the key.",
      "B. Select PSK from the Auth Key Mgmt drop-down list, set the PSK Format to ASCII, and enter the key.",
      "C. Select ASCII from the PSK Format drop-down list, enter the key, and leave the Auth Key Mgmt setting blank.",
      "D. Select the WPA2 Policy and AES check boxes.",
      "E. Select the WPA2 Policy, AES, and TKIP check boxes."
    ],
    "correctOption": [
      1,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/46.png"
  },
  {
    "id": 40,
    "questionNo": "Question #6",
    "question": "Refer to the exhibit. Which minimum configuration items are needed to enable Secure Shell version 2 access to R15? (Choose one answer)",
    "options": [
      "A. Router(config)#crypto key generate rsa general-keys modulus 1024\nRouter(config)#ip ssh version 2\nRouter(config-line)#line vty 0 15\nRouter(config-line)#transport input ssh\nRouter(config)#ip ssh logging events\nR15(config)#ip ssh stricthostkeycheck",
      "B. Router(config)#ip domain-name cisco.com\nRouter(config)#crypto key generate rsa general-keys modulus 1024\nRouter(config)#ip ssh version 2\nRouter(config-line)#line vty 0 15\nRouter(config-line)#transport input all\nRouter(config)#ip ssh logging events",
      "C. Router(config)#hostname R15\nR15(config)#crypto key generate rsa general-keys modulus 1024\nR15(config-line)#line vty 0 15\nR15(config-line)#transport input ssh\nR15(config)#ip ssh source-interface fa0/0\nR15(config)#ip ssh stricthostkeycheck",
      "D. Router(config)#hostname R15\nR15(config)#ip domain-name cisco.com\nR15(config)#crypto key generate rsa general-keys modulus 1024\nR15(config)#ip ssh version 2\nR15(config-line)#line vty 0 15\nR15(config-line)#transport input ssh"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/6.png"
  },
  {
    "id": 41,
    "questionNo": "Question #27",
    "question": "Refer to the exhibit. The following requirements must be met:\nMAC addresses must be learned dynamically.\nLog messages must be generated without disabling the interface when unwanted traffic is seen.\n\nWhich commands complete this task? Choose two. (Choose two answers)",
    "options": [
      "A. switchport port-security violation restrict",
      "B. switchport port-security maximum 2",
      "C. switchport port-security violation shutdown",
      "D. switchport port-security mac-address sticky",
      "E. switchport port-security mac-address 0010.7B84.45E6"
    ],
    "correctOption": [
      0,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/27.png"
  },
  {
    "id": 42,
    "questionNo": "Question #33",
    "question": "If Port-channel1 is the uplink interface of the access-layer switch toward the distribution-layer switch, which two configurations must be configured on the access-layer switch to provide protection from an ARP spoofing attack? Choose two. (Choose two answers)",
    "options": [
      "A. ip arp inspection vlan 1-4094\ninterface Port-channel1\n ip arp inspection trust",
      "B. ip dhcp snooping vlan 1-4094\ninterface Port-channel1\n switchport protected\n switchport port-security maximum 1",
      "C. ip arp inspection trust\ninterface Port-channel1\n switchport port-security maximum 4094\n switchport protected\n ip verify source mac-check",
      "D. ip dhcp snooping vlan 1-4094\nip dhcp snooping\ninterface Port-channel1\n ip dhcp snooping trust",
      "E. ip dhcp snooping\ninterface Port-channel1\n switchport port-security maximum 1\n switchport port-security"
    ],
    "correctOption": [
      0,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 43,
    "questionNo": "Question #44",
    "question": "Refer to the exhibit. What is the correct next hop for router R1 to reach IP addresses 192.168.2.6 and 10.20.1.50? (Choose one answer)",
    "options": [
      "A. 172.16.1.1",
      "B. 172.16.1.3",
      "C. 172.16.1.4",
      "D. 172.16.1.2"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/44.png"
  },
  {
    "id": 44,
    "questionNo": "Question #9",
    "question": "Refer to the exhibit. A network engineer configures the Cisco WLC to authenticate local wireless clients against a RADIUS server. Which action completes this configuration? (Choose one answer)",
    "options": [
      "A. Enable the Support for CoA option.",
      "B. Disable the Server Status option.",
      "C. Enable the Network User option.",
      "D. Enable the Management option."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/9.png"
  },
  {
    "id": 45,
    "questionNo": "Question #34",
    "question": "Refer to the exhibit. What does the host do when the status of the IP address is \"Preferred\"? (Choose one answer)",
    "options": [
      "A. It forces the DNS server to provide the same IPv4 address at each renewal.",
      "B. It prefers a pool of addresses when renewing the IPv4 host IP address.",
      "C. It requests the same IP address when it renews its lease.",
      "D. It continues to use a statically assigned IPv4 address."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/34.png"
  },
  {
    "id": 46,
    "questionNo": "Question #28",
    "question": "Refer to the exhibit. A network engineer must configure the CPE router to allow computers in the 172.20.1.0/24 network to obtain their IP configurations from the central DHCP server. Which configuration must the engineer apply to the CPE? (Choose one answer)",
    "options": [
      "A. interface GigabitEthernet0/1\n ip helper-address 172.20.254.1",
      "B. interface GigabitEthernet0/1\n ip helper-address 172.20.255.11",
      "C. interface GigabitEthernet0/0\n ip helper-address 172.20.1.1",
      "D. interface GigabitEthernet0/0\n ip helper-address 172.20.255.1"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/28.png"
  },
  {
    "id": 47,
    "questionNo": "Question #35",
    "question": "Refer to the exhibit. Connections must be blocked from PC2 to the file server while still allowing PC2 to connect to other network hosts and devices. Which configuration must be used to complete the task? (Choose one answer)",
    "options": [
      "A. R1(config)#access-list 1 deny 192.168.2.10\nR1(config)#access-list 1 permit 192.168.2.0 0.0.0.255\nR1(config)#interface g0/1\nR1(config-if)#ip access-group 1 in",
      "B. R2(config)#access-list 1 permit 192.168.2.10\nR2(config)#access-list 1 deny 192.168.2.0 0.0.0.255\nR2(config)#interface g0/1\nR2(config-if)#ip access-group 1 in",
      "C. R1(config)#access-list 1 permit 192.168.2.10\nR1(config)#access-list 1 deny any\nR1(config)#interface g0/1\nR1(config-if)#ip access-group 1 out",
      "D. R2(config)#access-list 1 deny 192.168.2.10\nR2(config)#access-list 1 permit any\nR2(config)#interface g0/1\nR2(config-if)#ip access-group 1 out"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/35.png"
  },
  {
    "id": 48,
    "questionNo": "Question #20",
    "question": "Refer to the exhibit. An engineer is updating the management access configuration of switch SW1 to allow secured, encrypted remote configuration. Which two commands or command sequences must the engineer apply to the switch? (Choose two answers)",
    "options": [
      "A. SW1(config)#line vty 0 15\nSW1(config-line)#transport input ssh",
      "B. SW1(config)#username NEW secret R3mote123",
      "C. SW1(config)#interface f0/1\nSW1(config-if)#switchport mode trunk",
      "D. SW1(config)#enable secret ccnaTest123",
      "E. SW1(config)#crypto key generate rsa"
    ],
    "correctOption": [
      0,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/20.png"
  },
  {
    "id": 49,
    "questionNo": "Question #50",
    "question": "Refer to the exhibit. Which routes are configured with their default administrative distances? (Choose one answer)",
    "options": [
      "A. RIP",
      "B. OSPF",
      "C. EIGRP",
      "D. Local"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/50.png"
  },
  {
    "id": 50,
    "questionNo": "Question #29",
    "question": "Refer to the exhibit. OSPF neighbors routers A, B, C, and D are sending a route for 10.227.150.160/27. When the current route for 10.227.150.160/27 becomes unavailable, which cost will router Y use to route traffic to 10.227.150.160/27? (Choose one answer)",
    "options": [
      "A. cost 20",
      "B. cost 30",
      "C. cost 40",
      "D. cost 50"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/29.png"
  },
  {
    "id": 51,
    "questionNo": "Question #60",
    "question": "What does traffic shaping do? (Choose one answer)",
    "options": [
      "A. It organizes traffic into classes.",
      "B. It queues excess traffic.",
      "C. It sets QoS attributes within a packet.",
      "D. It modifies the QoS attributes of a packet."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 52,
    "questionNo": "Question #73",
    "question": "What are two reasons to implement DHCP in a network? (Choose two answers)",
    "options": [
      "A. to access a website by name instead of by IP address",
      "B. to control the length of time an IP address is used by a network device",
      "C. to reduce administrative time in managing IP address ranges for clients",
      "D. to manually control and configure IP addresses for all network devices",
      "E. to have dynamic control over the best path to reach an IP address"
    ],
    "correctOption": [
      1,
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 53,
    "questionNo": "Question #78",
    "question": "A network administrator must enable DHCP services between two sites. What must be configured for the router to pass DHCPDISCOVER messages on to the server? (Choose one answer)",
    "options": [
      "A. a DHCP pool",
      "B. a DHCP relay agent",
      "C. DHCP binding",
      "D. DHCP snooping"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 54,
    "questionNo": "Question #95",
    "question": "How does MAC learning function? (Choose one answer)",
    "options": [
      "A. increases security on the management VLAN",
      "B. sends frames with unknown destinations to a multicast group",
      "C. rewrites the source and destination MAC address",
      "D. associates the MAC address with the port on which it is received"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 55,
    "questionNo": "Question #96",
    "question": "Which role does AI play in monitoring network data flow? (Choose one answer)",
    "options": [
      "A. It analyzes patterns for anomaly detection.",
      "B. It makes ethical judgements on private data surveillance.",
      "C. It exclusively predicts device malfunctions.",
      "D. It guarantees zero network downtime."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 56,
    "questionNo": "Question #99",
    "question": "What is the role of nonoverlapping channels in a wireless environment? (Choose one answer)",
    "options": [
      "A. to increase bandwidth",
      "B. to allow for channel bonding",
      "C. to reduce interference",
      "D. to enable faster roaming"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 57,
    "questionNo": "Question #51",
    "question": "Which SNMP message type is reliable and precedes an acknowledgment response from the SNMP manager? (Choose one answer)",
    "options": [
      "A. Inform",
      "B. Trap",
      "C. Set",
      "D. Get"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 58,
    "questionNo": "Question #52",
    "question": "Which AP mode wirelessly connects two separate network segments each set up within a different campus building? (Choose one answer)",
    "options": [
      "A. local",
      "B. mesh",
      "C. bridge",
      "D. point-to-point"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 59,
    "questionNo": "Question #53",
    "question": "What is a characteristic of a Layer 2 switch? (Choose one answer)",
    "options": [
      "A. uses routers to create collision domains",
      "B. uses the data link layer for MAC address learning and forwarding",
      "C. is responsible for sending data in a particular sequence",
      "D. operates at the transport layer to segment data"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 60,
    "questionNo": "Question #81",
    "question": "An engineer is updating the configuration on a switch. To meet updated security standards, Telnet must be replaced with encrypted connections, and the modulus size must be increased to 2048 bits. Which two commands must the engineer configure on the switch? (Choose two answers)",
    "options": [
      "A. crypto key generate rsa general-keys modulus 1024",
      "B. crypto key generate rsa usage-keys",
      "C. crypto key generate rsa modulus 2048",
      "D. transport input all",
      "E. transport input ssh"
    ],
    "correctOption": [
      2,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 61,
    "questionNo": "Question #92",
    "question": "What two features introduced in SNMPv2 provide the ability to retrieve large amounts of data in one request and acknowledge a trap using PDUs? (Choose two answers)",
    "options": [
      "A. GetNext",
      "B. Get",
      "C. Set",
      "D. GetBulk",
      "E. Inform"
    ],
    "correctOption": [
      3,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 62,
    "questionNo": "Question #57",
    "question": "Refer to the exhibit. What is represented by the curly brackets in line 2 within this JSON schema? (Choose one answer)",
    "options": [
      "A. key",
      "B. array",
      "C. object",
      "D. value"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/57.png"
  },
  {
    "id": 63,
    "questionNo": "Question #58",
    "question": "What are two advantages of a controller-based architecture instead of a traditional network architecture? (Choose two answers)",
    "options": [
      "A. It allows for seamless connectivity to virtual machines (VMs).",
      "B. It supports complex and high-scale IP addressing schemes.",
      "C. It increases security against denial-of-service attacks.",
      "D. It enables configuration task automation.",
      "E. It provides increased centralized scalability and management options."
    ],
    "correctOption": [
      3,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 64,
    "questionNo": "Question #64",
    "question": "When a WPA2-PSK WLAN is configured on the Wireless LAN Controller, what is the minimum number of characters that is required for the passphrase? (Choose one answer)",
    "options": [
      "A. 6",
      "B. 8",
      "C. 12",
      "D. 18"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 65,
    "questionNo": "Question #83",
    "question": "What is the role of disaggregation in controller-based networking? (Choose one answer)",
    "options": [
      "A. It summarizes the routes between the core and distribution layers of a network topology.",
      "B. It streamlines traffic handling by assigning individual devices to perform either Layer 2 or Layer 3 functions.",
      "C. It divides the control-plane and data-plane functions.",
      "D. It enables a network topology to quickly adjust from a ring network to a star network."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 66,
    "questionNo": "Question #100",
    "question": "Which characteristic differentiates the concept of authentication from authorization and accounting? (Choose one answer)",
    "options": [
      "A. user-activity logging",
      "B. service limitations",
      "C. identity verification",
      "D. consumption-based billing"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 67,
    "questionNo": "Question #62",
    "question": "Which security element uses a combination of one-time passwords, a login name, and a personal smartphone? (Choose one answer)",
    "options": [
      "A. port-based authentication",
      "B. software-defined segmentation",
      "C. multifactor authentication",
      "D. role-based access control"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 68,
    "questionNo": "Question #66",
    "question": "How do servers connect to the network in a virtual environment? (Choose one answer)",
    "options": [
      "A. wireless to an access point that is physically connected to the network",
      "B. a software switch on a hypervisor that is physically connected to the network",
      "C. a cable connected to a physical switch on the network",
      "D. a virtual switch that links to an access point physically connected to the network"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 69,
    "questionNo": "Question #67",
    "question": "Which two features are provided by Ansible in network automation? (Choose two answers)",
    "options": [
      "A. offers agentless architecture",
      "B. launches job templates using version control",
      "C. pushes configurations over SSH",
      "D. supplies proprietary daemon agents",
      "E. uses YAML language for playbooks"
    ],
    "correctOption": [
      0,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 70,
    "questionNo": "Question #74",
    "question": "How does network automation help reduce network downtime during implementation? (Choose one answer)",
    "options": [
      "A. It delays applying critical patches until off-peak hours to avoid disrupting users.",
      "B. It increases the success rate of changes by building templates and automated testing into implementation.",
      "C. It disables network security features during maintenance windows to speed up changes.",
      "D. It prevents performance degradation by using automated scripts to periodically restart networking devices."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 71,
    "questionNo": "Question #82",
    "question": "What is the difference between AAA authentication and authorization? (Choose one answer)",
    "options": [
      "A. Authentication tracks user resource usage, and authorization handles auditing, billing, and reporting.",
      "B. Authentication controls the system processes a user accesses, and authorization logs the activities the user initiates.",
      "C. Authentication determines what resource a user is allowed to use, and authorization validates the user password.",
      "D. Authentication identifies and verifies a user who is attempting to access a system, and authorization controls the tasks the user performs."
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 72,
    "questionNo": "Question #86",
    "question": "What is an advantage of using SDN versus traditional networking when it comes to security? (Choose one answer)",
    "options": [
      "A. Security is managed near the perimeter of the network with firewalls, VPNs, and IPS.",
      "B. Devices communicate with each other to establish a security policy.",
      "C. It creates a unified control point making security policies consistent across all devices.",
      "D. It exposes an API to configure locally per device for security policies."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 73,
    "questionNo": "Question #98",
    "question": "What is the purpose of the logging facility? (Choose one answer)",
    "options": [
      "A. It indicates the program or process that generated the syslog event.",
      "B. It defines the severity of the syslog event.",
      "C. It contains the text message that describes the syslog event.",
      "D. It represents the timestamp of the syslog event."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 74,
    "questionNo": "Question #65",
    "question": "Which wireless security protocol provides Protected Management Frames (PMF) by default? (Choose one answer)",
    "options": [
      "A. WPA",
      "B. WEP",
      "C. WPA2",
      "D. WPA3"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 75,
    "questionNo": "Question #68",
    "question": "Which WAN topology connects all remote sites to a central site and routes all inter-site traffic through the central site? (Choose one answer)",
    "options": [
      "A. point-to-multipoint",
      "B. point-to-point",
      "C. full mesh",
      "D. hub-and-spoke"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 76,
    "questionNo": "Question #75",
    "question": "What is the definition of a backdoor threat? (Choose one answer)",
    "options": [
      "A. a legitimate user account compromised via social engineering",
      "B. an insecure physical entrance to a data center facility",
      "C. malicious code that is inserted to grant unauthorized remote access to a system",
      "D. a denial of service attack on the perimeter firewall"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 77,
    "questionNo": "Question #84",
    "question": "Which two values or settings must be entered when configuring a new WLAN in the Cisco Wireless LAN Controller GUI? (Choose two answers)",
    "options": [
      "A. management interface settings",
      "B. SSID",
      "C. QoS settings",
      "D. IP address of one or more access points",
      "E. Profile Name"
    ],
    "correctOption": [
      1,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 78,
    "questionNo": "Question #90",
    "question": "What is a function of Layer 3 switches? (Choose one answer)",
    "options": [
      "A. They translate broadcast traffic when operating in Layer 3 mode exclusively.",
      "B. They route traffic between devices in different VLANs.",
      "C. They forward Ethernet frames between VLANs using only MAC addresses.",
      "D. They prioritize traffic using deep packet inspection."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 79,
    "questionNo": "Question #94",
    "question": "What is the function of a northbound API in a network architecture that separates the control and application layers? (Choose one answer)",
    "options": [
      "A. It supports distributed processing for configuration.",
      "B. It relies on global provisioning and configuration.",
      "C. It upgrades software and restores files.",
      "D. It provides a path between an SDN controller and network applications."
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 80,
    "questionNo": "Question #69",
    "question": "Which role does machine learning play in identifying network security breaches? (Choose one answer)",
    "options": [
      "A. It establishes baseline behaviors and detects deviations indicating zero-day attacks.",
      "B. It applies static firewall rules based on predefined signatures.",
      "C. It replaces the requirement for encryption protocols.",
      "D. It automatically powers off switches when an alert occurs."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 81,
    "questionNo": "Question #70",
    "question": "Which threat type is caused by an authorized user intentionally or unintentionally leaking sensitive information via email? (Choose one answer)",
    "options": [
      "A. phishing",
      "B. insider threat",
      "C. man-in-the-middle",
      "D. ransomware"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 82,
    "questionNo": "Question #88",
    "question": "What is the purpose of a CNAME record? (Choose one answer)",
    "options": [
      "A. to associate an alias to a canonical domain name",
      "B. to map a domain name to an IP address",
      "C. to identify the authoritative name server for a domain",
      "D. to direct email to a mail server"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 83,
    "questionNo": "Question #87",
    "question": "Which type of wired port is required when an AP offers multiple unique SSIDs, passes client data and management traffic across separate VLANs, and is in autonomous mode? (Choose one answer)",
    "options": [
      "A. default",
      "B. LAG",
      "C. access",
      "D. trunk"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 84,
    "questionNo": "Question #91",
    "question": "Why would VRRP be implemented when configuring a new subnet in a multivendor environment? (Choose one answer)",
    "options": [
      "A. to prevent Layer 2 bridging loops within the subnet",
      "B. to ensure that the spanning-tree forwarding path to the gateway is loop-free",
      "C. to provide enhanced security features for Cisco devices",
      "D. to enable normal operations to continue after a gateway failure without requiring a change in host ARP cache"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 85,
    "questionNo": "Question #76",
    "question": "What is the function of the AAA accounting service? (Choose one answer)",
    "options": [
      "A. It tracks and logs the resources a user accesses and the duration of the session.",
      "B. It prompts the user for credentials to verify identity.",
      "C. It determines the commands a user is allowed to execute.",
      "D. It encrypts all network payload traffic."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 86,
    "questionNo": "Question #93",
    "question": "A router received three destination prefixes 10.0.0.0/8, 10.0.0.0/16, and 10.0.0.0/24. When the show ip route command is executed, which output does it return? (Choose one answer)",
    "options": [
      "A. Gateway of last resort is 172.16.1.1 to network 0.0.0.0, O E2 10.0.0.0/8 [110/5] via 192.168.1.1, Ethernet0, O E2 10.0.0.0/16 [110/5] via 192.168.2.1, Ethernet1, O E2 10.0.0.0/24 [110/5] via 192.168.3.1, Ethernet2",
      "B. Gateway of last resort is 172.16.1.1 to network 0.0.0.0, O E2 10.0.0.0/16 [110/5] via 192.168.2.1, Ethernet1, O E2 10.0.0.0/24 [110/5] via 192.168.3.1, Ethernet2",
      "C. Gateway of last resort is 172.16.1.1 to network 0.0.0.0, O E2 10.0.0.0/24 [110/5] via 192.168.3.1, Ethernet2",
      "D. Gateway of last resort is 172.16.1.1 to network 0.0.0.0, O E2 10.0.0.0/8 [110/5] via 192.168.1.1, Ethernet0"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": "Router# show ip route\nGateway of last resort is 172.16.1.1 to network 0.0.0.0\n\n      10.0.0.0/8 is variably subnetted, 3 subnets, 3 masks\nO E2     10.0.0.0/8 [110/5] via 192.168.1.1, 00:15:23, Ethernet0\nO E2     10.0.0.0/16 [110/5] via 192.168.2.1, 00:15:23, Ethernet1\nO E2     10.0.0.0/24 [110/5] via 192.168.3.1, 00:15:23, Ethernet2\nS*    0.0.0.0/0 [1/0] via 172.16.1.1",
    "exhibitImage": null
  },
  {
    "id": 87,
    "questionNo": "Question #85",
    "question": "Refer to the exhibit. A network engineer must replicate the AccessSW1 NTP configuration on a new switch. The engineer could not access privileged mode on AccessSW1 to view its configuration. Which command must be applied to the new switch to replicate the configuration? (Choose one answer)",
    "options": [
      "A. ntp server 127.127.1.1",
      "B. ntp server 2001:db8:12::1",
      "C. ntp master",
      "D. ntp master 3"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/85.png"
  },
  {
    "id": 88,
    "questionNo": "Question #89",
    "question": "Refer to the exhibit. What is represented by the square brackets in line 1 within this JSON schema? (Choose one answer)",
    "options": [
      "A. object",
      "B. array",
      "C. key",
      "D. value"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": "[\n  {\n    \"hostname\": \"Switch-1\",\n    \"ip_address\": \"192.168.1.10\",\n    \"vendor\": \"Cisco\",\n    \"role\": \"Access-Layer\",\n    \"interfaces\": [\n      \"GigabitEthernet0/1\",\n      \"GigabitEthernet0/2\"\n    ]\n  }\n]",
    "exhibitImage": null
  },
  {
    "id": 89,
    "questionNo": "Question #55",
    "question": "An administrator is configuring a Cisco Catalyst switch so that it will accept management connections only from hosts in the 203.0.113.0/24 network. Other traffic passing through the switch must transit without interruption. Which two configurations must the engineer apply to the switch? (Choose two answers)",
    "options": [
      "A. ip access-list extended Management, permit tcp any range 22 23 203.0.113.0 0.0.0.255",
      "B. interface range vlan 1 - 4094, ip access-group Management out",
      "C. ip access-list standard Management, permit 203.0.113.0 0.0.0.255",
      "D. line vty 0 15, access-class Management in",
      "E. ip access-list standard Management, permit 203.0.113.0 255.255.255.0"
    ],
    "correctOption": [
      2,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 90,
    "questionNo": "Question #71",
    "question": "What is the purpose of a First Hop Redundancy Protocol (FHRP)? (Choose one answer)",
    "options": [
      "A. It uses bridge priorities to create multiple paths to a single destination.",
      "B. It protects against gateway failures by allowing Layer 3 load balancing across multiple OSPF neighbors.",
      "C. It allows directly connected switches to share configuration information.",
      "D. It protects against default gateway failures by allowing more than one router to represent a virtual default gateway IP address."
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 91,
    "questionNo": "Question #61",
    "question": "Refer to the exhibit. A TCP connection has been initiated and sourced from 10.54.21.20 to a server with a destination address of 172.20.21.43. To which interface will the traffic be forwarded? (Choose one answer)",
    "options": [
      "A. Ethernet2/0/0",
      "B. Ethernet2/1/0",
      "C. Ethernet2/1/1",
      "D. Ethernet1/0/0"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/61.png"
  },
  {
    "id": 92,
    "questionNo": "Question #80",
    "question": "Which interface condition is occurring in this output? (Choose one answer)",
    "options": [
      "A. high collision rate",
      "B. duplex mismatch",
      "C. bad NIC",
      "D. broadcast storm"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": "Router# show interfaces GigabitEthernet0/1\nGigabitEthernet0/1 is up, line protocol is up\n  Hardware is Gigabit Ethernet, address is 000c.29eb.1234 (bia 000c.29eb.1234)\n  Internet address is 10.1.1.1/24\n  MTU 1500 bytes, BW 100000 Kbit/sec, DLY 100 usec,\n     reliability 255/255, txload 1/255, rxload 1/255\n  Encapsulation ARPA, loopback not set\n  Keepalive set (10 sec)\n  Half-duplex, 100Mb/s, media type is RJ45\n  output flow-control is unsupported, input flow-control is unsupported\n  ARP type: ARPA, ARP Timeout 04:00:00\n  Last input 00:00:02, output 00:00:01, output hang never\n  Last clearing of \"show interface\" counters never\n  Input queue: 0/75/0/0 (size/max/drops/flushes); Total output drops: 0\n  Queueing strategy: fifo\n  Output queue: 0/40 (size/max)\n  5 minute input rate 1000 bits/sec, 2 packets/sec\n  5 minute output rate 2000 bits/sec, 3 packets/sec\n     145823 packets input, 10245892 bytes, 0 no buffer\n     Received 412 broadcasts (0 IP multicasts)\n     0 runts, 0 giants, 0 throttles\n     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored\n     0 watchdog, 0 multicast, 0 pause input\n     185291 packets output, 15478923 bytes, 0 underruns\n     0 output errors, 8421 collisions, 2 interface resets\n     8421 late collisions, 2415 deferred, 0 lost carrier, 0 no carrier",
    "exhibitImage": null
  },
  {
    "id": 93,
    "questionNo": "Question #56",
    "question": "Refer to the exhibit. Which prefix did router R1 learn from an EIGRP neighbor? (Choose one answer)",
    "options": [
      "A. 192.168.1.0/24",
      "B. 192.168.2.0/24",
      "C. 192.168.3.0/24",
      "D. 172.16.1.0/24"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/56.png"
  },
  {
    "id": 94,
    "questionNo": "Question #54",
    "question": "Refer to the exhibit. The loopback IP of R3 has been learned via the two interfaces on R1. R1 is configured with reference-bandwidth 10000. Based on the metric calculations, which next-hop IP would be used for outgoing routing? (Choose one answer)",
    "options": [
      "A. 10.11.1.2",
      "B. 10.12.1.2",
      "C. 10.12.5.2",
      "D. 10.12.1.1"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/54.png"
  },
  {
    "id": 95,
    "questionNo": "Question #79",
    "question": "Refer to the exhibit. Of the routes learned with dynamic routing protocols, which route is preferred? (Choose one answer)",
    "options": [
      "A. OSPF",
      "B. EIGRP",
      "C. BGP",
      "D. RIP"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/79.png"
  },
  {
    "id": 96,
    "questionNo": "Question #59",
    "question": "Refer to the exhibit. An engineer is creating a secure preshared key based SSID using WPA2 for a wireless network running on 2.4 GHz and 5 GHz. Which two tasks must the engineer perform to complete the process? (Choose two answers)",
    "options": [
      "A. Select the PSK option for Auth Key Management.",
      "B. Select the AES(CCMP128) option for WPA2/WPA3 Encryption.",
      "C. Select the AES option for Auth Key Management.",
      "D. Select the 802.1x option for Auth Key Management.",
      "E. Select the WPA Policy option."
    ],
    "correctOption": [
      0,
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/59.png"
  },
  {
    "id": 97,
    "questionNo": "Question #97",
    "question": "Refer to the exhibit. Which interface does a packet take to reach the destination address of 10.10.10.14? (Choose one answer)",
    "options": [
      "A. Serial 0/0",
      "B. FastEthernet 0/1",
      "C. FastEthernet 0/2",
      "D. FastEthernet 0/0"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/97.png"
  },
  {
    "id": 98,
    "questionNo": "Question #63",
    "question": "Refer to the exhibit. Which problem is indicated by the interface counter output? (Choose one answer)",
    "options": [
      "A. duplex mismatch",
      "B. speed mismatch",
      "C. encapsulation failure",
      "D. cable length exceeds standard"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/63.png"
  },
  {
    "id": 99,
    "questionNo": "Question #77",
    "question": "Refer to the exhibit. Shortly after SiteA was connected to SiteB over a new single-mode fiber path, users at SiteA report intermittent connectivity issues with applications hosted at SiteB. What can be determined from the output? (Choose one answer)",
    "options": [
      "A. Interface errors are incrementing.",
      "B. The sites were connected with the wrong cable type.",
      "C. High traffic is causing high latency.",
      "D. An incorrect SFP media type was used at SiteA."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/77.png"
  },
  {
    "id": 100,
    "questionNo": "Question #72",
    "question": "Refer to the exhibit. Traffic sourced from the loopback0 interface is initiating SSH to the host at 10.1.1.4. What is the next hop to the destination address? (Choose one answer)",
    "options": [
      "A. 192.168.0.7",
      "B. 192.168.0.4",
      "C. 192.168.0.40",
      "D. 192.168.3.5"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/72.png"
  },
  {
    "id": 101,
    "questionNo": "Question #165",
    "question": "What is a characteristic of spine-and-leaf architecture? (Choose one answer)",
    "options": [
      "A. Leaf switches are interconnected with each other.",
      "B. Every leaf switch is connected to every spine switch.",
      "C. Spine switches connect directly to access layer switches.",
      "D. It is primarily designed for North-South perimeter traffic."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 102,
    "questionNo": "Question #166",
    "question": "What is the difference between SNMP traps and SNMP polling? (Choose one answer)",
    "options": [
      "A. SNMP traps are initiated using a push model at the network device, and SNMP polling is initiated at the server.",
      "B. SNMP traps are used for proactive monitoring, and SNMP polling is used for reactive monitoring.",
      "C. SNMP traps are initiated by the network server, and network devices initiate SNMP polling.",
      "D. SNMP traps send periodic updates via the MIB, and SNMP polling sends data on demand."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 103,
    "questionNo": "Question #155",
    "question": "Which advantage does machine learning offer for network security? (Choose one answer)",
    "options": [
      "A. It controls VPN access permissions.",
      "B. It manages firewall rule sets.",
      "C. It improves real-time threat detection by identifying anomaly patterns.",
      "D. It enforces password complexity requirements."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 104,
    "questionNo": "Question #172",
    "question": "Which interface on the WLC is used exclusively as a DHCP relay and client web authentication? (Choose one answer)",
    "options": [
      "A. service port interface",
      "B. virtual interface",
      "C. distribution system interface",
      "D. AP-manager interface"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 105,
    "questionNo": "Question #158",
    "question": "Which cloud model allows the customer to install its own operating system on a virtual machine? (Choose one answer)",
    "options": [
      "A. PaaS",
      "B. IaaS",
      "C. SaaS",
      "D. CaaS"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 106,
    "questionNo": "Question #164",
    "question": "How is VLAN hopping mitigated? (Choose one answer)",
    "options": [
      "A. by disabling Spanning Tree Protocol on trunk ports",
      "B. by disabling Dynamic Trunking Protocol (DTP) and setting unused ports as access in an unused VLAN",
      "C. by configuring port security with dynamic MAC learning",
      "D. by configuring Private VLANs on access switches"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 107,
    "questionNo": "Question #161",
    "question": "Which command must be configured for port security with a manually assigned MAC address of aabb.cc00.1234 for a VoIP handset on VLAN 4? (Choose one answer)",
    "options": [
      "A. mac-address-table static aabb.cc00.1234 vlan 4 interface fa0/1",
      "B. switchport port-security mac-address aabb.cc00.1234 vlan 4",
      "C. switchport port-security mac-address aabb.cc00.1234",
      "D. switchport port-security mac-address sticky"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 108,
    "questionNo": "Question #160",
    "question": "Which protocol is used to securely manage network devices over an encrypted connection? (Choose one answer)",
    "options": [
      "A. Telnet",
      "B. SSH",
      "C. HTTP",
      "D. SNMPv1"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 109,
    "questionNo": "Question #157",
    "question": "Which security measure is considered a physical security control in an organization? (Choose one answer)",
    "options": [
      "A. backing up syslogs at a remote location",
      "B. setting up cameras to monitor key infrastructure",
      "C. configuring a password for the console port",
      "D. configuring enable secret passwords on network devices"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 110,
    "questionNo": "Question #153",
    "question": "Which component of an SDN architecture translates business requirements into network configurations? (Choose one answer)",
    "options": [
      "A. northbound API",
      "B. application layer",
      "C. southbound API",
      "D. data plane"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 111,
    "questionNo": "Question #177",
    "question": "Which feature is mandatory for a wireless network using WPA3-Personal mode? (Choose one answer)",
    "options": [
      "A. Fast Transition",
      "B. Opportunistic Wireless Encryption",
      "C. Protected Management Frames (PMF)",
      "D. Enhanced Open"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 112,
    "questionNo": "Question #176",
    "question": "Refer to the exhibit. A packet sourced from 10.10.10.32 is destined for the Internet. What is the administrative distance for the destination route? (Choose one answer)",
    "options": [
      "A. 0",
      "B. 1",
      "C. 110",
      "D. 32"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/176.png"
  },
  {
    "id": 113,
    "questionNo": "Question #174",
    "question": "Refer to the exhibit. What is the effect of the configuration? (Choose one answer)",
    "options": [
      "A. Traffic initiated from IP range 10.0.0.0 - 10.255.255.255 is translated on Serial0.",
      "B. Traffic sourced from range 10.0.0.0 - 10.0.0.255 is allowed on Serial0.",
      "C. The configuration will only permit traffic that is already established from the 10.0.0.0/24 subnet.",
      "D. The router will automatically create a corresponding outbound ACL to permit return traffic."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/174.png"
  },
  {
    "id": 114,
    "questionNo": "Question #170",
    "question": "How does a DNS server improve network efficiency when resolving domain names? (Choose one answer)",
    "options": [
      "A. by caching resolved queries to reduce resolution time for subsequent requests",
      "B. by compressing DNS records to decrease packet payload size",
      "C. by broadcasting requests to all local subnets simultaneously",
      "D. by storing all global DNS records in local memory"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 115,
    "questionNo": "Question #163",
    "question": "Which interface enables communication between a program on the controller and a program on the networking device? (Choose one answer)",
    "options": [
      "A. southbound API",
      "B. northbound API",
      "C. software virtual interface",
      "D. tunnel interface"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 116,
    "questionNo": "Question #156",
    "question": "Why would a network administrator implement an FHRP? (Choose one answer)",
    "options": [
      "A. to provide default gateway redundancy in the case of a router failure",
      "B. to allow an interface to be configured with multiple default gateway IPs",
      "C. to load balance traffic across switches at Layer 2",
      "D. to dynamically assign IP addresses to hosts"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 117,
    "questionNo": "Question #154",
    "question": "Which function generally performed by a traditional network device is replaced by an SDN controller? (Choose one answer)",
    "options": [
      "A. encapsulation and decapsulation of packets in a data-link frame",
      "B. building routing tables and determining the forwarding path",
      "C. changing the source or destination address during NAT operations",
      "D. encryption and decryption for VPN link processing"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 118,
    "questionNo": "Question #152",
    "question": "Which protocol should be used to transfer large files on a company intranet that allows UDP port 69 through the firewall? (Choose one answer)",
    "options": [
      "A. FTP",
      "B. TFTP",
      "C. SFTP",
      "D. REST API"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 119,
    "questionNo": "Question #175",
    "question": "Refer to the exhibit. PC A is communicating with another device at IP address 10.227.225.255. Through which router does router Y route the traffic? (Choose one answer)",
    "options": [
      "A. router A",
      "B. router B",
      "C. router C",
      "D. router D"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/175.png"
  },
  {
    "id": 120,
    "questionNo": "Question #171",
    "question": "Which is a fact related to FTP? (Choose one answer)",
    "options": [
      "A. It uses block numbers to identify and mitigate data-transfer errors.",
      "B. It uses two separate connections for control and data traffic.",
      "C. It relies on the well-known UDP port 69.",
      "D. It always operates without user authentication."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 121,
    "questionNo": "Question #168",
    "question": "What is an advantage of using a dynamic routing protocol instead of static routing? (Choose one answer)",
    "options": [
      "A. lower CPU and memory utilization on routers",
      "B. higher security due to absence of routing advertisements",
      "C. complete administrative control over path selection",
      "D. automatic discovery and rerouting around network topology changes"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 122,
    "questionNo": "Question #200",
    "question": "How does automation reduce the operational complexity of a managed network? (Choose one answer)",
    "options": [
      "A. It streamlines monitoring using SNMP and other polling tools.",
      "B. It categorizes network traffic and provides real-time telemetry insights.",
      "C. It reduces repetitive manual configuration tasks across multiple devices.",
      "D. It allows all controller code to be vendor-agnostic."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 123,
    "questionNo": "Question #173",
    "question": "Refer to the exhibit. Which configuration allows hosts in the 192.168.1.0/24 network to access the Internet using Port Address Translation (PAT)? (Choose one answer)",
    "options": [
      "A. ip nat inside source list 1 interface GigabitEthernet0/0",
      "B. ip nat outside source list 1 interface GigabitEthernet0/1 overload",
      "C. ip nat inside source static 192.168.1.1 209.165.200.225",
      "D. ip nat inside source list 1 interface GigabitEthernet0/1 overload"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/173.png"
  },
  {
    "id": 124,
    "questionNo": "Question #162",
    "question": "Which two protocols operate at the transport layer of the OSI model? (Choose two answers)",
    "options": [
      "A. TCP",
      "B. IP",
      "C. UDP",
      "D. ICMP",
      "E. ARP"
    ],
    "correctOption": [
      0,
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 125,
    "questionNo": "Question #186",
    "question": "Which feature when used on a WLC allows it to bundle its distribution system ports into one 802.3ad group? (Choose one answer)",
    "options": [
      "A. QinQ",
      "B. LAG",
      "C. ISL",
      "D. PAgP"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 126,
    "questionNo": "Question #185",
    "question": "What is the role of an autonomous access point? (Choose one answer)",
    "options": [
      "A. It relies on a WLC for client authentication and RF management.",
      "B. It provides a lightweight tunnel using CAPWAP.",
      "C. It performs all wireless and security management functions independently.",
      "D. It operates exclusively in monitor mode."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 127,
    "questionNo": "Question #184",
    "question": "Which function does Spanning Tree Protocol (STP) perform in a Layer 2 network? (Choose one answer)",
    "options": [
      "A. prevents routing loops by exchanging routing tables",
      "B. prevents Layer 2 switching loops by placing redundant ports into a blocking state",
      "C. aggregates physical links into a single logical channel",
      "D. assigns VLAN tags to Ethernet frames"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 128,
    "questionNo": "Question #179",
    "question": "Which type of wireless frame is used to request association with an access point? (Choose one answer)",
    "options": [
      "A. Control frame",
      "B. Management frame",
      "C. Data frame",
      "D. Beacon frame"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 129,
    "questionNo": "Question #196",
    "question": "Which mechanism is used by CDP to discover directly connected Cisco devices? (Choose one answer)",
    "options": [
      "A. periodic multicast advertisements sent to MAC 0100.0ccc.cccc",
      "B. broadcast queries sent on the local subnet",
      "C. unicast SNMP requests sent to neighboring IP addresses",
      "D. LLDP advertisements sent to all interfaces"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 130,
    "questionNo": "Question #195",
    "question": "Which routing protocol metric is calculated based on bandwidth and delay by default? (Choose one answer)",
    "options": [
      "A. EIGRP",
      "B. OSPF",
      "C. RIP",
      "D. BGP"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 131,
    "questionNo": "Question #182",
    "question": "What is the default administrative distance of an internal EIGRP route? (Choose one answer)",
    "options": [
      "A. 90",
      "B. 110",
      "C. 120",
      "D. 170"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 132,
    "questionNo": "Question #194",
    "question": "Which command enables BPDU Guard globally on all PortFast-enabled ports on a Cisco switch? (Choose one answer)",
    "options": [
      "A. spanning-tree portfast bpduguard default",
      "B. spanning-tree bpduguard enable",
      "C. spanning-tree portfast bpdufilter default",
      "D. spanning-tree loopguard default"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 133,
    "questionNo": "Question #192",
    "question": "Refer to the exhibit. Which prefix did router R1 select as the successor route to 192.168.1.0/24? (Choose one answer)",
    "options": [
      "A. 192.168.1.0/24 via 10.1.1.2",
      "B. 192.168.1.0/24 via 10.1.1.6",
      "C. 192.168.1.0/24 via 10.1.1.10",
      "D. 192.168.1.0/24 via 10.1.1.14"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/192.png"
  },
  {
    "id": 134,
    "questionNo": "Question #189",
    "question": "Refer to the exhibit. Which route will be installed in the routing table for destination 172.16.1.0/24? (Choose one answer)",
    "options": [
      "A. OSPF route with AD 110",
      "B. Static route with AD 1",
      "C. RIP route with AD 120",
      "D. EIGRP route with AD 90"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/189.png"
  },
  {
    "id": 135,
    "questionNo": "Question #187",
    "question": "Which function does a DNS query perform? (Choose one answer)",
    "options": [
      "A. allows a DNS client to request the IP address associated with a domain name",
      "B. updates records dynamically across multiple servers",
      "C. encrypts communications between DNS servers",
      "D. obtains information directly from all root DNS servers within the scope"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 136,
    "questionNo": "Question #198",
    "question": "How does automation affect network management processes? (Choose one answer)",
    "options": [
      "A. It transitions network management from reactive troubleshooting to proactive policy enforcement.",
      "B. It eliminates the need for monitoring syslog messages.",
      "C. It restricts device access to GUI interfaces only.",
      "D. It removes the necessity for testing changes before deployment."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 137,
    "questionNo": "Question #151",
    "question": "Refer to the exhibit. Each route is present within the routing table. Which interface is used to forward traffic with a destination IP of 10.1.1.19? (Choose one answer)",
    "options": [
      "A. FastEthernet0/3",
      "B. FastEthernet0/0",
      "C. FastEthernet0/1",
      "D. FastEthernet0/4"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/151.png"
  },
  {
    "id": 138,
    "questionNo": "Question #197",
    "question": "Which plane is centralized in a controller-based software-defined network? (Choose one answer)",
    "options": [
      "A. data plane",
      "B. management plane",
      "C. control plane",
      "D. forwarding plane"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 139,
    "questionNo": "Question #180",
    "question": "Refer to the exhibit. What data structure do the square brackets in the JSON example represent? (Choose one answer)",
    "options": [
      "A. array",
      "B. value",
      "C. key",
      "D. object"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/180.png"
  },
  {
    "id": 140,
    "questionNo": "Question #159",
    "question": "Refer to the exhibit. To which device does Router1 send packets that are destined to host 10.10.13.165? (Choose one answer)",
    "options": [
      "A. Router2",
      "B. Router3",
      "C. Router4",
      "D. Router5"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/159.png"
  },
  {
    "id": 141,
    "questionNo": "Question #167",
    "question": "Refer to the exhibit. What is the administrative distance for the advertised prefix that includes the host IP address 192.168.20.1? (Choose one answer)",
    "options": [
      "A. 110",
      "B. 24",
      "C. 90",
      "D. 1"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/167.png"
  },
  {
    "id": 142,
    "questionNo": "Question #191",
    "question": "Refer to the exhibit. Which route does R1 select for traffic that is destined to 192.168.16.27? (Choose one answer)",
    "options": [
      "A. 192.168.16.0/24",
      "B. 192.168.16.0/25",
      "C. 192.168.16.0/26",
      "D. 192.168.16.0/27"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/191.png"
  },
  {
    "id": 143,
    "questionNo": "Question #178",
    "question": "Refer to the exhibit. Which command must be configured to provide a description and enable DHCP snooping trust on FastEthernet0/1? (Choose one answer)",
    "options": [
      "A. ip dhcp snooping trust",
      "B. description Link to Server, ip dhcp snooping trust",
      "C. switchport mode access, ip dhcp snooping trust",
      "D. ip dhcp snooping limit rate 100"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/178.png"
  },
  {
    "id": 144,
    "questionNo": "Question #188",
    "question": "Refer to the exhibit. Which functionalities will this SSID have while being used by wireless clients? (Choose one answer)",
    "options": [
      "A. decreases network security against offline dictionary attacks and encourages easy access to the network",
      "B. increases network security against man-in-the-middle attacks and discourages denial of service attacks",
      "C. decreases network security against air sniffing attacks and discourages the use of complex passwords",
      "D. increases network security against offline dictionary attacks and discourages time-consuming brute force attacks"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/188.png"
  },
  {
    "id": 145,
    "questionNo": "Question #183",
    "question": "Refer to the exhibit. If the network environment is operating normally, which type of device must be connected to interface FastEthernet0/1? (Choose one answer)",
    "options": [
      "A. access point",
      "B. DHCP client",
      "C. rogue switch",
      "D. router / trusted switch"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/183.png"
  },
  {
    "id": 146,
    "questionNo": "Question #169",
    "question": "Refer to the exhibit. A Cisco engineer creates a new WLAN called lantest. Which two actions must be performed so that only high-speed 2.4-GHz clients connect? (Choose two answers)",
    "options": [
      "A. Enable the Broadcast SSID option.",
      "B. Set the Interface/Interface Group to an interface other than guest.",
      "C. Set the Radio Policy option to 802.11a Only.",
      "D. Set the Radio Policy option to 802.11g Only.",
      "E. Check the Status Enabled option."
    ],
    "correctOption": [
      3,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/169.png"
  },
  {
    "id": 147,
    "questionNo": "Question #199",
    "question": "Refer to the exhibit. What is represented by the curly brackets in line 3 within this JSON schema? (Choose one answer)",
    "options": [
      "A. object",
      "B. key",
      "C. array",
      "D. value"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/199.png"
  },
  {
    "id": 148,
    "questionNo": "Question #190",
    "question": "Refer to the exhibit. Users on VLAN 100 can reach sites on the Internet. Which action must the administrator take to establish connectivity to the Internet for users in VLAN 200? (Choose one answer)",
    "options": [
      "A. Define a NAT pool on the router.",
      "B. Configure the ip nat outside command on another interface for VLAN 200.",
      "C. Configure static NAT translations for VLAN 200.",
      "D. Update the access list NAT_INSIDE_RANGES to include the 10.10.20.0/24 subnet."
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/190.png"
  },
  {
    "id": 149,
    "questionNo": "Question #193",
    "question": "Refer to the exhibit. Which command allows only VLAN 72 and VLAN 82 on the trunk link? (Choose one answer)",
    "options": [
      "A. switchport trunk allowed vlan 72,82",
      "B. switchport trunk allowed vlan add 72,82",
      "C. switchport trunk encapsulation dot1q",
      "D. switchport mode trunk"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/193.png"
  },
  {
    "id": 150,
    "questionNo": "Question #181",
    "question": "After a recent security breach and a RADIUS failure, an engineer must secure the console port of each enterprise router with a local username and password. Which configuration must the engineer apply to accomplish this task? (Choose one answer)",
    "options": [
      "A. aaa new-model; aaa authorization exec default local; aaa authentication login default radius; username localuser privilege 15 secret plaintextpassword",
      "B. aaa new-model; line con 0; password plaintextpassword; privilege level 15",
      "C. username localuser secret plaintextpassword; line con 0; no login local; privilege level 15",
      "D. username localuser secret plaintextpassword; line con 0; login local; privilege level 15"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 151,
    "questionNo": "Question #107",
    "question": "Which role do predictive AI models play in network management? (Choose one answer)",
    "options": [
      "A. They anticipate future traffic spikes.",
      "B. They automate the assignment of IP addresses to devices.",
      "C. They generate real-time reports on current bandwidth usage.",
      "D. They select correct cabling types for deployment."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 152,
    "questionNo": "Question #122",
    "question": "Which cipher is supported for wireless encryption only with the WPA2 standard? (Choose one answer)",
    "options": [
      "A. AES (CCMP)",
      "B. RC4 (TKIP)",
      "C. SHA",
      "D. DES"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 153,
    "questionNo": "Question #111",
    "question": "Which cable type must be used when connecting a router and switch together? (Choose one answer)",
    "options": [
      "A. straight-through",
      "B. console",
      "C. crossover",
      "D. rollover"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 154,
    "questionNo": "Question #127",
    "question": "What does a host do when a URL is entered in a browser? (Choose one answer)",
    "options": [
      "A. It prompts the user to specify the desired IP address.",
      "B. It continuously attempts to resolve the URL until the command is cancelled.",
      "C. It attempts to query a DNS server on the network.",
      "D. It initiates a ping request to the URL."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 155,
    "questionNo": "Question #123",
    "question": "Which port is used by HTTPS for secure web management and REST API communication? (Choose one answer)",
    "options": [
      "A. TCP 80",
      "B. TCP 443",
      "C. UDP 69",
      "D. TCP 22"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 156,
    "questionNo": "Question #131",
    "question": "Which standard defines the Power over Ethernet Plus (PoE+) specification providing up to 30W of power? (Choose one answer)",
    "options": [
      "A. IEEE 802.3af",
      "B. IEEE 802.3at",
      "C. IEEE 802.3bt",
      "D. IEEE 802.11ax"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 157,
    "questionNo": "Question #125",
    "question": "How must a switch interface be configured to carry traffic for multiple VLANs? (Choose one answer)",
    "options": [
      "A. EtherChannel",
      "B. trunk port",
      "C. access port",
      "D. PoE port"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 158,
    "questionNo": "Question #120",
    "question": "What is the function of the Spanning Tree Protocol (STP) Root Bridge? (Choose one answer)",
    "options": [
      "A. It acts as the central reference point for all spanning-tree path calculations.",
      "B. It assigns dynamic IP addresses to connected switches.",
      "C. It forwards all broadcast traffic without applying ACLs.",
      "D. It disables all access ports across the Layer 2 domain."
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 159,
    "questionNo": "Question #119",
    "question": "Which WAN technology uses labels to make forwarding decisions across a service provider network? (Choose one answer)",
    "options": [
      "A. MPLS",
      "B. Frame Relay",
      "C. Metro Ethernet",
      "D. HDLC"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 160,
    "questionNo": "Question #118",
    "question": "What is the purpose of dynamic ARP inspection (DAI)? (Choose one answer)",
    "options": [
      "A. to prevent DHCP starvation attacks on access ports",
      "B. to validate ARP packets against the DHCP snooping binding database to prevent ARP poisoning",
      "C. to dynamically assign IP addresses to hosts without DHCP",
      "D. to block multicast traffic across untrusted trunk ports"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 161,
    "questionNo": "Question #112",
    "question": "Which command sets the default gateway on a Cisco Layer 2 switch? (Choose one answer)",
    "options": [
      "A. ip default-gateway <ip-address>",
      "B. ip route 0.0.0.0 0.0.0.0 <ip-address>",
      "C. default-information originate",
      "D. ip default-network <ip-address>"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 162,
    "questionNo": "Question #109",
    "question": "Which two benefits are provided by implementing Cisco DNA Center in an enterprise network? (Choose two answers)",
    "options": [
      "A. centralized policy-based network management and automation",
      "B. replacement of all physical Layer 3 routers with software daemons",
      "C. mandatory manual configuration of individual device CLI syntax",
      "D. elimination of all access layer switches",
      "E. end-to-end network visibility and AI-driven assurance"
    ],
    "correctOption": [
      0,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 163,
    "questionNo": "Question #129",
    "question": "Which IPv6 address type is automatically configured on an interface using the fe80::/10 prefix? (Choose one answer)",
    "options": [
      "A. Global Unicast",
      "B. Link-Local",
      "C. Unique Local",
      "D. Multicast"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 164,
    "questionNo": "Question #117",
    "question": "What is the purpose of an Access Control List (ACL) wildcard mask? (Choose one answer)",
    "options": [
      "A. to specify which bits of an IP address must be matched (0) or ignored (1)",
      "B. to encrypt the matching IP packets",
      "C. to define the QoS priority level of matching traffic",
      "D. to calculate the OSPF cost for the interface"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 165,
    "questionNo": "Question #147",
    "question": "Which type of routing protocol uses the Bellman-Ford algorithm? (Choose one answer)",
    "options": [
      "A. Link-state",
      "B. Distance-vector",
      "C. Path-vector",
      "D. Hybrid"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 166,
    "questionNo": "Question #144",
    "question": "Refer to the exhibit. What is the effect of the switchport port-security violation restrict command? (Choose one answer)",
    "options": [
      "A. The port is immediately error-disabled and shuts down.",
      "B. Frames with unauthorized MAC addresses are forwarded without logging.",
      "C. Frames with unauthorized MAC addresses are dropped, an SNMP trap is generated, and the violation counter increments.",
      "D. The port resets and flushes the MAC address table."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/144.png"
  },
  {
    "id": 167,
    "questionNo": "Question #126",
    "question": "Which port state in Rapid Spanning Tree Protocol (RSTP) replaces both the Listening and Blocking states of 802.1D? (Choose one answer)",
    "options": [
      "A. Discarding",
      "B. Learning",
      "C. Forwarding",
      "D. Disabled"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 168,
    "questionNo": "Question #114",
    "question": "Which component of a REST API request specifies the operation to be performed (such as GET, POST, PUT, DELETE)? (Choose one answer)",
    "options": [
      "A. HTTP verb / method",
      "B. URI path parameter",
      "C. JSON payload",
      "D. User-Agent header"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 169,
    "questionNo": "Question #113",
    "question": "What is the function of the JSON format in network automation? (Choose one answer)",
    "options": [
      "A. to execute binary firmware upgrades on switches",
      "B. to compile Python code into executable scripts",
      "C. to configure physical interface clock rates",
      "D. to provide a lightweight, human-readable data interchange format for APIs"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 170,
    "questionNo": "Question #103",
    "question": "Refer to the exhibit. Which two statements about the OSPF configuration are true? (Choose two answers)",
    "options": [
      "A. The router is operating in Area 1 exclusively.",
      "B. The router ID is 10.1.1.1.",
      "C. GigabitEthernet0/0 is participating in OSPF Area 0.",
      "D. The OSPF process ID is 1.",
      "E. FastEthernet0/1 is configured as an OSPF stub network."
    ],
    "correctOption": [
      2,
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/103.png"
  },
  {
    "id": 171,
    "questionNo": "Question #150",
    "question": "Which QoS mechanism drops incoming traffic exceeding the configured CIR while passing conforming traffic? (Choose one answer)",
    "options": [
      "A. Queuing",
      "B. Shaping",
      "C. Policing",
      "D. Marking"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 172,
    "questionNo": "Question #146",
    "question": "Which IPv6 address represents the loopback address? (Choose one answer)",
    "options": [
      "A. ::1",
      "B. ::",
      "C. fe80::1",
      "D. ff02::1"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 173,
    "questionNo": "Question #138",
    "question": "Which command enables IPv6 routing globally on a Cisco router? (Choose one answer)",
    "options": [
      "A. ipv6 unicast-routing",
      "B. ipv6 enable",
      "C. ipv6 route ::/0",
      "D. ipv6 cef"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 174,
    "questionNo": "Question #134",
    "question": "What is the default STP forward delay timer value? (Choose one answer)",
    "options": [
      "A. 2 seconds",
      "B. 15 seconds",
      "C. 20 seconds",
      "D. 30 seconds"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 175,
    "questionNo": "Question #128",
    "question": "Which WAN technology uses point-to-point tunneling protocol to securely connect remote workers over the Internet? (Choose one answer)",
    "options": [
      "A. MPLS",
      "B. IPsec VPN",
      "C. DWDM",
      "D. Leased line"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 176,
    "questionNo": "Question #105",
    "question": "Refer to the exhibit. Which route will be selected to forward traffic destined to 10.1.1.1?",
    "options": [
      "A. 10.0.0.0/8 via 192.168.1.1",
      "B. 10.1.0.0/16 via 192.168.2.1",
      "C. 10.1.1.0/24 via 192.168.3.1",
      "D. 10.1.1.0/28 via 192.168.4.1"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/105.png"
  },
  {
    "id": 177,
    "questionNo": "Question #149",
    "question": "Which protocol is used by network devices to synchronize their system clocks with a reference time source? (Choose one answer)",
    "options": [
      "A. SNMP",
      "B. NTP",
      "C. PTP",
      "D. Syslog"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 178,
    "questionNo": "Question #145",
    "question": "Which layer of the TCP/IP model corresponds to the OSI Session, Presentation, and Application layers? (Choose one answer)",
    "options": [
      "A. Network Access",
      "B. Internet",
      "C. Transport",
      "D. Application"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 179,
    "questionNo": "Question #133",
    "question": "Refer to the exhibit. What are the steps an engineer must take to provide the highest encryption and authentication using domain credentials from LDAP? (Choose two answers)",
    "options": [
      "A. Select Static-WEP + 802.1X on Layer 2 Security.",
      "B. Select WPA+WPA2 on Layer 2 Security.",
      "C. Select WPA Policy with TKIP Encryption.",
      "D. Select PSK under Authentication Key Management.",
      "E. Select 802.1X from under Authentication Key Management."
    ],
    "correctOption": [
      1,
      4
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/133.png"
  },
  {
    "id": 180,
    "questionNo": "Question #132",
    "question": "Refer to the exhibit. Which command completes the configuration to establish an EtherChannel using LACP between two Cisco switches? (Choose one answer)",
    "options": [
      "A. channel-group 1 mode active",
      "B. channel-group 1 mode on",
      "C. channel-group 1 mode auto",
      "D. channel-group 1 mode desirable"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/132.png"
  },
  {
    "id": 181,
    "questionNo": "Question #104",
    "question": "Refer to the exhibit. What is the administrative distance and metric for the OSPF route? (Choose one answer)",
    "options": [
      "A. AD 110, Metric 2",
      "B. AD 90, Metric 110",
      "C. AD 120, Metric 2",
      "D. AD 1, Metric 0"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/104.png"
  },
  {
    "id": 182,
    "questionNo": "Question #102",
    "question": "Refer to the exhibit. Which route will router R1 choose for traffic destined to 10.1.1.5? (Choose one answer)",
    "options": [
      "A. OSPF route 10.1.1.0/24 [110/2]",
      "B. EIGRP route 10.1.1.0/28 [90/25600]",
      "C. Static route 10.1.0.0/16 [1/0]",
      "D. Connected route 10.0.0.0/8 [0/0]"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/102.png"
  },
  {
    "id": 183,
    "questionNo": "Question #148",
    "question": "What is the purpose of the Cisco Discovery Protocol (CDP)? (Choose one answer)",
    "options": [
      "A. to dynamically route packets between different autonomous systems",
      "B. to share information about directly connected Cisco devices such as device ID and capabilities",
      "C. to assign IP addresses automatically to newly connected hosts",
      "D. to detect and block broadcast storms across Layer 2 links"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 184,
    "questionNo": "Question #139",
    "question": "Which component of an IPv6 global unicast address identifies the specific subnet within an enterprise organization? (Choose one answer)",
    "options": [
      "A. Subnet ID (16 bits)",
      "B. Global Routing Prefix (48 bits)",
      "C. Interface ID (64 bits)",
      "D. Link-Local Prefix (10 bits)"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 185,
    "questionNo": "Question #135",
    "question": "Which security attack occurs when an unauthorized rogue DHCP server provides incorrect IP configurations and default gateway to clients? (Choose one answer)",
    "options": [
      "A. MAC Flooding",
      "B. DHCP Spoofing / Man-in-the-Middle",
      "C. VLAN Hopping",
      "D. SYN Flood"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 186,
    "questionNo": "Question #130",
    "question": "Refer to the exhibit. What is the subnet mask of the route to the 10.10.13.160 network? (Choose one answer)",
    "options": [
      "A. 255.255.255.128",
      "B. 255.255.255.248",
      "C. 255.255.255.240",
      "D. 255.255.248.0"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/130.png"
  },
  {
    "id": 187,
    "questionNo": "Question #142",
    "question": "Which command is used on Cisco IOS switches to display all active dynamic MAC address entries? (Choose one answer)",
    "options": [
      "A. show mac address-table dynamic",
      "B. show arp dynamic",
      "C. show ip route mac",
      "D. show interface mac-address"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 188,
    "questionNo": "Question #106",
    "question": "Refer to the exhibit. Which router or router group are configured as NTP clients? (Choose one answer)",
    "options": [
      "A. R1",
      "B. R1, R2, and R3",
      "C. R2 and R3",
      "D. R1, R3, and R4"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/106.png"
  },
  {
    "id": 189,
    "questionNo": "Question #124",
    "question": "Which type of NAT allows a single public IP address to be used by multiple internal private hosts by distinguishing sessions with unique port numbers? (Choose one answer)",
    "options": [
      "A. Static NAT",
      "B. Dynamic NAT Pool",
      "C. Port Address Translation (PAT) / NAT Overload",
      "D. Dual NAT"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 190,
    "questionNo": "Question #110",
    "question": "Refer to the exhibit. Users will be using a configured secret key and SSID and must have a secured key hashing algorithm configured. The AAA server must not be used for the user authentication method. Which action completes the task? (Choose one answer)",
    "options": [
      "A. Set CCMP128(AES).",
      "B. Configure PSK:SHA2.",
      "C. Configure PSK Format HEX with key string.",
      "D. Enable AutoConfig PSK."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/110.png"
  },
  {
    "id": 191,
    "questionNo": "Question #115",
    "question": "Refer to the exhibit. The loopback IP of R3 has been learned via the two interfaces on R1. R1 is configured with a reference bandwidth of 10 Gbps. Based on the metric calculations, which next hop IP would be used for outgoing routing? (Choose one answer)",
    "options": [
      "A. 10.12.0.2",
      "B. 10.12.0.1",
      "C. 10.12.0.5",
      "D. 10.12.0.6"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/115.png"
  },
  {
    "id": 192,
    "questionNo": "Question #143",
    "question": "Which interface condition is occurring in this output? (Choose one answer)",
    "options": [
      "A. bad NIC",
      "B. high throughput / heavy load",
      "C. broadcast storm",
      "D. duplex mismatch"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": "Router# show interfaces GigabitEthernet0/1\nGigabitEthernet0/1 is up, line protocol is up\n  Hardware is Gigabit Ethernet, address is 000c.29eb.1234 (bia 000c.29eb.1234)\n  Internet address is 10.1.1.1/24\n  MTU 1500 bytes, BW 100000 Kbit/sec, DLY 100 usec,\n     reliability 255/255, txload 1/255, rxload 1/255\n  Encapsulation ARPA, loopback not set\n  Keepalive set (10 sec)\n  Half-duplex, 100Mb/s, media type is RJ45\n  output flow-control is unsupported, input flow-control is unsupported\n  ARP type: ARPA, ARP Timeout 04:00:00\n  Last input 00:00:02, output 00:00:01, output hang never\n  Last clearing of \"show interface\" counters never\n  Input queue: 0/75/0/0 (size/max/drops/flushes); Total output drops: 0\n  Queueing strategy: fifo\n  Output queue: 0/40 (size/max)\n  5 minute input rate 1000 bits/sec, 2 packets/sec\n  5 minute output rate 2000 bits/sec, 3 packets/sec\n     145823 packets input, 10245892 bytes, 0 no buffer\n     Received 412 broadcasts (0 IP multicasts)\n     0 runts, 0 giants, 0 throttles\n     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored\n     0 watchdog, 0 multicast, 0 pause input\n     185291 packets output, 15478923 bytes, 0 underruns\n     0 output errors, 8421 collisions, 2 interface resets\n     8421 late collisions, 2415 deferred, 0 lost carrier, 0 no carrier",
    "exhibitImage": null
  },
  {
    "id": 193,
    "questionNo": "Question #101",
    "question": "Refer to the exhibit. Which prefix did router R1 learn from an OSPF neighbor? (Choose one answer)",
    "options": [
      "A. 172.16.1.0/24",
      "B. 192.168.1.0/24",
      "C. 192.168.2.0/24",
      "D. 10.0.0.0/8"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/101.png"
  },
  {
    "id": 194,
    "questionNo": "Question #108",
    "question": "Refer to the exhibit. An engineer was asked to update wireless LAN controller configuration on a newly deployed SSID Office. What can the engineer determine about this configuration? (Choose one answer)",
    "options": [
      "A. There is an extended delay that helps in minimizing the time it takes for client devices to stay connected after roaming.",
      "B. There is an advanced security algorithm into the service to add an extra level of quality assurance.",
      "C. There is a seamless transition mechanism (802.11r FT) used to expedite roaming for compatible devices by authenticating them before potential roaming occurs.",
      "D. There is an additional protection level that helps secure the data frames between wireless clients."
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/108.png"
  },
  {
    "id": 195,
    "questionNo": "Question #121",
    "question": "Which SNMP version introduced support for message authentication using MD5/SHA and data encryption using DES/AES? (Choose one answer)",
    "options": [
      "A. SNMPv1",
      "B. SNMPv2c",
      "C. SNMPv3",
      "D. SNMPv4"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 196,
    "questionNo": "Question #116",
    "question": "Refer to the exhibit. PC-2 gets Connection refused by remote host when trying to Telnet. Without permitting Telnet from PC-1, what must be done to allow the traffic? (Choose one answer)",
    "options": [
      "A. Remove the access-class command from line vty.",
      "B. Add the access-list 10 permit any command to the existing ACL.",
      "C. Add the ip access-group 10 out command to interface g0/0.",
      "D. Remove the password command from line vty."
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/116.png"
  },
  {
    "id": 197,
    "questionNo": "Question #140",
    "question": "Refer to the exhibit. When does a DHCP client first attempt to renew its IP address lease with the DHCP server? (Choose one answer)",
    "options": [
      "A. when 25% of the lease time remains",
      "B. when 87.5% (T2) of the lease duration expires",
      "C. when 50% (T1) of the lease duration expires",
      "D. when 100% of the lease expires"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/140.png"
  },
  {
    "id": 198,
    "questionNo": "Question #136",
    "question": "Refer to the exhibit. Which command must be used to complete the configuration of NAT using port-overload for the LAN on router A to reach the Internet? (Choose one answer)",
    "options": [
      "A. ip nat inside source list 1 interface GigabitEthernet0/0/0",
      "B. ip nat inside source list 1 interface serial 0/0/0 overload",
      "C. ip nat pool PUBLIC 209.165.201.1 209.165.201.30 netmask 255.255.255.224",
      "D. ip nat inside source static 192.168.1.1 209.165.201.1"
    ],
    "correctOption": [
      1
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/136.png"
  },
  {
    "id": 199,
    "questionNo": "Question #137",
    "question": "Refer to the exhibit. Which command is required to enable password encryption for all cleartext passwords stored in the running configuration? (Choose one answer)",
    "options": [
      "A. service password-encryption",
      "B. enable secret 5 cisco",
      "C. service password-encryption; transport input ssh",
      "D. crypto key generate rsa"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/137.png"
  },
  {
    "id": 200,
    "questionNo": "Question #141",
    "question": "Refer to the exhibit. Which additional configuration must be applied to allow administrators to authenticate directly to global configuration mode via Telnet using a local username and password? (Choose one answer)",
    "options": [
      "A. username admin privilege 15 secret p@ss1234; line vty 0 4; login local",
      "B. privilege 15 secret p@ss1234; line vty 0 4",
      "C. enable secret p@ss1234; line vty 0 4; login",
      "D. username admin password cisco; line vty 0 4"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/141.png"
  },
  {
    "id": 201,
    "questionNo": "Question #203",
    "question": "Which protocol is used by network management applications to securely collect device state and health metrics over UDP port 161? (Choose one answer)",
    "options": [
      "A. NetFlow",
      "B. Syslog",
      "C. IPFIX",
      "D. SNMP"
    ],
    "correctOption": [
      3
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 202,
    "questionNo": "Question #204",
    "question": "What is the purpose of the 802.1Q tag in Ethernet frames? (Choose one answer)",
    "options": [
      "A. to identify the VLAN to which the frame belongs on trunk links",
      "B. to perform CRC error checking on the physical medium",
      "C. to establish Spanning Tree Protocol root bridge priority",
      "D. to assign IP addresses dynamically to connected devices"
    ],
    "correctOption": [
      0
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 203,
    "questionNo": "Question #201",
    "question": "Which routing protocol uses Dijkstra Shortest Path First (SPF) algorithm? (Choose one answer)",
    "options": [
      "A. RIP",
      "B. EIGRP",
      "C. OSPF",
      "D. BGP"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 204,
    "questionNo": "Question #206",
    "question": "Refer to the exhibit. Which two statements about the interface status are true? (Choose two answers)",
    "options": [
      "A. The line protocol is up and operating normally.",
      "B. The interface is administratively down.",
      "C. The MTU is set to 1500 bytes.",
      "D. The interface is operating in half-duplex mode.",
      "E. Input errors are exceeding threshold limits."
    ],
    "correctOption": [
      0,
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": "exhibits/206.png"
  },
  {
    "id": 205,
    "questionNo": "Question #207",
    "question": "Which interface condition is indicated by a high number of CRC errors on an Ethernet switch port? (Choose one answer)",
    "options": [
      "A. broadcast storm",
      "B. duplex mismatch",
      "C. faulty cabling / electrical interference / bad hardware",
      "D. routing loop"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 206,
    "questionNo": "Question #205",
    "question": "Which mechanism prevents unauthorized DHCP servers on a local network by classifying switch ports as trusted or untrusted? (Choose one answer)",
    "options": [
      "A. Dynamic ARP Inspection",
      "B. Port Security",
      "C. DHCP Snooping",
      "D. IP Source Guard"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 207,
    "questionNo": "Question #202",
    "question": "What is the function of the Spanning Tree Protocol PortFast feature? (Choose one answer)",
    "options": [
      "A. to increase link bandwidth by bonding multiple physical cables",
      "B. to encrypt Spanning Tree Bridge Protocol Data Units (BPDUs)",
      "C. to allow access ports to transition immediately from blocking to forwarding state",
      "D. to dynamically assign ports to the native VLAN"
    ],
    "correctOption": [
      2
    ],
    "points": 10,
    "cliSnippet": null,
    "exhibitImage": null
  },
  {
    "id": 208,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #8",
    "question": "Drag and drop the networking characteristics from the left to the corresponding architecture type on the right. Not all options are used.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "deploys a consistent configuration across multiple devices",
        "distributed control plane is needed",
        "requires a distributed management plane",
        "southbound APIs are used to apply configurations",
        "northbound APIs interact with end devices"
      ],
      "targets": [
        "Traditional Networking 1",
        "Traditional Networking 2",
        "Controller-Based Networking 1",
        "Controller-Based Networking 2"
      ],
      "correctMatches": {
        "Traditional Networking 1": "distributed control plane is needed",
        "Traditional Networking 2": "requires a distributed management plane",
        "Controller-Based Networking 1": "deploys a consistent configuration across multiple devices",
        "Controller-Based Networking 2": "southbound APIs are used to apply configurations"
      }
    }
  },
  {
    "id": 209,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #14",
    "question": "Drag and drop the protocol advantages from the left onto the corresponding protocol types on the right. Not all advantages are used.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "capable of sending multicast transmissions",
        "transmits live and real-time data",
        "controls connections between sender and receiver",
        "guarantees packet delivery",
        "optimizes transmission rates to receiver",
        "uses stateful packet inspection"
      ],
      "targets": [
        "TCP 1",
        "TCP 2",
        "TCP 3",
        "UDP 1",
        "UDP 2"
      ],
      "correctMatches": {
        "TCP 1": "controls connections between sender and receiver",
        "TCP 2": "optimizes transmission rates to receiver",
        "TCP 3": "guarantees packet delivery",
        "UDP 1": "capable of sending multicast transmissions",
        "UDP 2": "transmits live and real-time data"
      }
    }
  },
  {
    "id": 210,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #5",
    "question": "Drag and drop the AAA terms from the left onto the descriptions on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "tracks user resource usage and session duration",
        "verifies user identity with credentials",
        "determines access rights and permitted commands"
      ],
      "targets": [
        "Authentication",
        "Authorization",
        "Accounting"
      ],
      "correctMatches": {
        "Authentication": "verifies user identity with credentials",
        "Authorization": "determines access rights and permitted commands",
        "Accounting": "tracks user resource usage and session duration"
      }
    }
  },
  {
    "id": 211,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #3",
    "question": "Drag and drop the characteristics from the left onto the corresponding wireless device types on the right. Not all characteristics are used.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "transmits and receives radio frequency (RF) signals",
        "configurable as a workgroup bridge",
        "uses templates to implement centralized QoS configuration",
        "supplies user connection data within a device group",
        "requires a special adapter for PoE"
      ],
      "targets": [
        "Access Point 1",
        "Access Point 2",
        "Wireless LAN Controller 1",
        "Wireless LAN Controller 2"
      ],
      "correctMatches": {
        "Access Point 1": "transmits and receives radio frequency (RF) signals",
        "Access Point 2": "configurable as a workgroup bridge",
        "Wireless LAN Controller 1": "uses templates to implement centralized QoS configuration",
        "Wireless LAN Controller 2": "supplies user connection data within a device group"
      }
    }
  },
  {
    "id": 212,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #19",
    "question": "Drag and drop the traffic types from the left onto the QoS delivery mechanisms on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "database synchronization traffic",
        "standard Web browsing traffic",
        "video streaming traffic",
        "VoIP voice traffic"
      ],
      "targets": [
        "Traffic Shaping",
        "Traffic Policing",
        "Best Effort Queue",
        "Priority Queue (LLQ)"
      ],
      "correctMatches": {
        "Traffic Shaping": "database synchronization traffic",
        "Traffic Policing": "video streaming traffic",
        "Best Effort Queue": "standard Web browsing traffic",
        "Priority Queue (LLQ)": "VoIP voice traffic"
      }
    }
  },
  {
    "id": 213,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #9",
    "question": "Drag and drop the characteristics from the left onto the corresponding cable types on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "transmits data in the form of electronic signals",
        "supplies conduit for PoE implementations",
        "used for high-throughput over short distances",
        "transmits signals using pulses of light"
      ],
      "targets": [
        "Copper Cable 1",
        "Copper Cable 2",
        "Multi-mode Fiber 1",
        "Multi-mode Fiber 2"
      ],
      "correctMatches": {
        "Copper Cable 1": "transmits data in the form of electronic signals",
        "Copper Cable 2": "supplies conduit for PoE implementations",
        "Multi-mode Fiber 1": "used for high-throughput over short distances",
        "Multi-mode Fiber 2": "transmits signals using pulses of light"
      }
    }
  },
  {
    "id": 214,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #2",
    "question": "Refer to the exhibit. Drag and drop the subnet masks from the left onto the corresponding subnets on the right. Not all subnet masks are used.",
    "points": 10,
    "exhibitImage": "exhibits/2-drag-drop.png",
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "255.255.255.128 (/25)",
        "255.255.255.240 (/28)",
        "255.255.255.248 (/29)",
        "255.255.255.252 (/30)",
        "255.255.248.0 (/21)",
        "255.255.255.224 (/27)"
      ],
      "targets": [
        "10.10.13.0",
        "10.10.13.128",
        "10.10.13.160",
        "10.10.13.252"
      ],
      "correctMatches": {
        "10.10.13.0": "255.255.255.128 (/25)",
        "10.10.13.128": "255.255.255.240 (/28)",
        "10.10.13.160": "255.255.255.248 (/29)",
        "10.10.13.252": "255.255.255.252 (/30)"
      }
    }
  },
  {
    "id": 215,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #21",
    "question": "An engineer needs to configure a switch with port security to ensure devices are unable to flood the port. The port must be configured to permit only two dynamic sticky MAC addresses. Drag and drop the configuration commands into the correct sequence on the right. Not all commands are used.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "switchport mode access",
        "switchport port-security",
        "switchport port-security mac-address sticky",
        "switchport port-security maximum 2",
        "switchport port-security violation shutdown"
      ],
      "targets": [
        "Step 1",
        "Step 2",
        "Step 3",
        "Step 4"
      ],
      "correctMatches": {
        "Step 1": "switchport mode access",
        "Step 2": "switchport port-security",
        "Step 3": "switchport port-security mac-address sticky",
        "Step 4": "switchport port-security maximum 2"
      }
    }
  },
  {
    "id": 216,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #17",
    "question": "Drag and drop the functions of AAA supporting protocols from the left onto the protocols on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "encrypts only the password when it sends an access request",
        "combines authentication and authorization",
        "uses UDP port 1812/1813",
        "encrypts the entire body of the access-request packet",
        "separates all three AAA operations (Authentication, Authorization, Accounting)",
        "uses TCP port 49"
      ],
      "targets": [
        "RADIUS 1",
        "RADIUS 2",
        "RADIUS 3",
        "TACACS+ 1",
        "TACACS+ 2",
        "TACACS+ 3"
      ],
      "correctMatches": {
        "RADIUS 1": "encrypts only the password when it sends an access request",
        "RADIUS 2": "combines authentication and authorization",
        "RADIUS 3": "uses UDP port 1812/1813",
        "TACACS+ 1": "encrypts the entire body of the access-request packet",
        "TACACS+ 2": "separates all three AAA operations (Authentication, Authorization, Accounting)",
        "TACACS+ 3": "uses TCP port 49"
      }
    }
  },
  {
    "id": 217,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #18",
    "question": "Drag and drop the characteristics from the left onto the corresponding cable types on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "contains a conductor, bedding, and outer sheathing",
        "comprised of shielded or unshielded twisted pairs",
        "has minimal light reflection as signal travels down the core",
        "transmits signals using laser pulses of light"
      ],
      "targets": [
        "Copper Cable 1",
        "Copper Cable 2",
        "Single-mode Fiber 1",
        "Single-mode Fiber 2"
      ],
      "correctMatches": {
        "Copper Cable 1": "contains a conductor, bedding, and outer sheathing",
        "Copper Cable 2": "comprised of shielded or unshielded twisted pairs",
        "Single-mode Fiber 1": "has minimal light reflection as signal travels down the core",
        "Single-mode Fiber 2": "transmits signals using laser pulses of light"
      }
    }
  },
  {
    "id": 218,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #20",
    "question": "Drag and drop the statements about AAA services from the left to the corresponding AAA services on the right. Not all options are used.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "It records the duration of each user connection.",
        "It supports user access reporting and auditing.",
        "It restricts the CLI commands that a user is able to perform.",
        "It grants access to network assets, such as FTP servers.",
        "It verifies identity via biometric scanning."
      ],
      "targets": [
        "Accounting 1",
        "Accounting 2",
        "Authorization 1",
        "Authorization 2"
      ],
      "correctMatches": {
        "Accounting 1": "It records the duration of each user connection.",
        "Accounting 2": "It supports user access reporting and auditing.",
        "Authorization 1": "It restricts the CLI commands that a user is able to perform.",
        "Authorization 2": "It grants access to network assets, such as FTP servers."
      }
    }
  },
  {
    "id": 219,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #13",
    "question": "Drag and drop the descriptions of security features from the left onto the corresponding features on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "may use a fingerprint reader or facial recognition to authenticate users",
        "relies on a 'something you are' authentication paradigm",
        "requires two or more authentication factors to verify identity",
        "supports enterprise, third-party, and public PKI trust models",
        "issuer may revoke the digital credential using CRL / OCSP"
      ],
      "targets": [
        "Biometrics 1",
        "Biometrics 2",
        "Multifactor Authentication (MFA)",
        "Digital Certificates 1",
        "Digital Certificates 2"
      ],
      "correctMatches": {
        "Biometrics 1": "may use a fingerprint reader or facial recognition to authenticate users",
        "Biometrics 2": "relies on a 'something you are' authentication paradigm",
        "Multifactor Authentication (MFA)": "requires two or more authentication factors to verify identity",
        "Digital Certificates 1": "supports enterprise, third-party, and public PKI trust models",
        "Digital Certificates 2": "issuer may revoke the digital credential using CRL / OCSP"
      }
    }
  },
  {
    "id": 220,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #15",
    "question": "Drag and drop the steps in a standard recursive DNS lookup operation into the correct chronological order on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "An endpoint submits a request for the IP address of a domain to the local DNS server.",
        "The local DNS server submits a request to a root DNS server.",
        "The local DNS server queries the authoritative domain DNS server.",
        "The local DNS server receives a reply containing the IP address from the domain DNS server.",
        "The local DNS server responds with the resolved IP address to the endpoint."
      ],
      "targets": [
        "Step 1",
        "Step 2",
        "Step 3",
        "Step 4",
        "Step 5"
      ],
      "correctMatches": {
        "Step 1": "An endpoint submits a request for the IP address of a domain to the local DNS server.",
        "Step 2": "The local DNS server submits a request to a root DNS server.",
        "Step 3": "The local DNS server queries the authoritative domain DNS server.",
        "Step 4": "The local DNS server receives a reply containing the IP address from the domain DNS server.",
        "Step 5": "The local DNS server responds with the resolved IP address to the endpoint."
      }
    }
  },
  {
    "id": 221,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #12",
    "question": "Drag and drop the access control list (ACL) characteristics from the left onto the corresponding ACL types on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "filters traffic based on source IP address only",
        "placed as close to the destination as possible",
        "filters traffic based on source and destination IP addresses and Layer 4 ports",
        "placed as close to the source as possible"
      ],
      "targets": [
        "Standard ACL 1",
        "Standard ACL 2",
        "Extended ACL 1",
        "Extended ACL 2"
      ],
      "correctMatches": {
        "Standard ACL 1": "filters traffic based on source IP address only",
        "Standard ACL 2": "placed as close to the destination as possible",
        "Extended ACL 1": "filters traffic based on source and destination IP addresses and Layer 4 ports",
        "Extended ACL 2": "placed as close to the source as possible"
      }
    }
  },
  {
    "id": 222,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #11",
    "question": "Drag and drop the configuration commands into the correct sequence to configure an enable secret on a Cisco router.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "enable",
        "configure terminal",
        "enable secret c1sc0@123",
        "exit",
        "write memory"
      ],
      "targets": [
        "First Command",
        "Second Command",
        "Third Command",
        "Fourth Command"
      ],
      "correctMatches": {
        "First Command": "enable",
        "Second Command": "configure terminal",
        "Third Command": "enable secret c1sc0@123",
        "Fourth Command": "exit"
      }
    }
  },
  {
    "id": 223,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #16",
    "question": "Drag and drop the AAA features from the left onto the corresponding AAA services on the right. Not all options are used.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "It determines what resources or commands a user or group can access.",
        "It limits which CLI commands a user can execute.",
        "It uses a RADIUS server to allow initial user access.",
        "It verifies the user identity before granting access to the device.",
        "It logs all executed commands for audit tracking."
      ],
      "targets": [
        "Authorization 1",
        "Authorization 2",
        "Authentication 1",
        "Authentication 2"
      ],
      "correctMatches": {
        "Authorization 1": "It determines what resources or commands a user or group can access.",
        "Authorization 2": "It limits which CLI commands a user can execute.",
        "Authentication 1": "It uses a RADIUS server to allow initial user access.",
        "Authentication 2": "It verifies the user identity before granting access to the device."
      }
    }
  },
  {
    "id": 224,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #10",
    "question": "Drag and drop the transport layer descriptions from the left onto the corresponding transport layer protocols on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "client confirms data delivery from the server",
        "checks for errors and guarantees reception via retransmissions",
        "delays data transmission if congestion is detected (flow control)",
        "able to send data without requiring an established connection beforehand",
        "supports broadcast and multicast traffic",
        "packets sent independently and received in no fixed order"
      ],
      "targets": [
        "TCP 1",
        "TCP 2",
        "TCP 3",
        "UDP 1",
        "UDP 2",
        "UDP 3"
      ],
      "correctMatches": {
        "TCP 1": "client confirms data delivery from the server",
        "TCP 2": "checks for errors and guarantees reception via retransmissions",
        "TCP 3": "delays data transmission if congestion is detected (flow control)",
        "UDP 1": "able to send data without requiring an established connection beforehand",
        "UDP 2": "supports broadcast and multicast traffic",
        "UDP 3": "packets sent independently and received in no fixed order"
      }
    }
  },
  {
    "id": 225,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #7",
    "question": "Drag and drop the Ansible automation features from the left onto the corresponding characteristics on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "executes modules via SSH by default",
        "uses playbooks written in YAML",
        "operates as an agentless automation engine",
        "requires custom agent software on target nodes"
      ],
      "targets": [
        "Connection Protocol",
        "Playbook Syntax",
        "Agent Architecture"
      ],
      "correctMatches": {
        "Connection Protocol": "executes modules via SSH by default",
        "Playbook Syntax": "uses playbooks written in YAML",
        "Agent Architecture": "operates as an agentless automation engine"
      }
    }
  },
  {
    "id": 226,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #4",
    "question": "Drag and drop the media characteristics from the left onto the corresponding cable types on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "comprised of shielded and unshielded twisted pairs (STP/UTP)",
        "is affected by electromagnetic interference (EMI)",
        "comprised of insulated glass strands",
        "uses a single wavelength of light over long distances"
      ],
      "targets": [
        "Copper Cable 1",
        "Copper Cable 2",
        "Single-mode Fiber 1",
        "Single-mode Fiber 2"
      ],
      "correctMatches": {
        "Copper Cable 1": "comprised of shielded and unshielded twisted pairs (STP/UTP)",
        "Copper Cable 2": "is affected by electromagnetic interference (EMI)",
        "Single-mode Fiber 1": "comprised of insulated glass strands",
        "Single-mode Fiber 2": "uses a single wavelength of light over long distances"
      }
    }
  },
  {
    "id": 227,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #6",
    "question": "Refer to the exhibit. A packet is destined for 192.168.20.100. Drag and drop the parameters of the destination route from the left onto the routing components on the right. Not all parameters are used.",
    "points": 10,
    "exhibitImage": "exhibits/6-drag-drop.png",
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "/28",
        "90",
        "30",
        "127",
        "110",
        "2172"
      ],
      "targets": [
        "Prefix Length",
        "Administrative Distance (AD)",
        "Metric / Cost"
      ],
      "correctMatches": {
        "Prefix Length": "/28",
        "Administrative Distance (AD)": "90",
        "Metric / Cost": "30"
      }
    }
  },
  {
    "id": 228,
    "type": "drag_drop",
    "questionNo": "Drag & Drop #1",
    "question": "Drag and drop the attack mitigation techniques from the left onto the types of attack that they mitigate on the right.",
    "points": 10,
    "exhibitImage": null,
    "cliSnippet": null,
    "dragDropData": {
      "items": [
        "configure the DHCP snooping feature and DAI",
        "disable the Dynamic Trunking Protocol (DTP)",
        "configure the native VLAN with a dedicated nondefault VLAN ID"
      ],
      "targets": [
        "Man-in-the-Middle / DHCP Spoofing Attack",
        "Switch-Spoofing VLAN-Hopping Attack",
        "802.1Q Double-Tagging VLAN-Hopping Attack"
      ],
      "correctMatches": {
        "Man-in-the-Middle / DHCP Spoofing Attack": "configure the DHCP snooping feature and DAI",
        "Switch-Spoofing VLAN-Hopping Attack": "disable the Dynamic Trunking Protocol (DTP)",
        "802.1Q Double-Tagging VLAN-Hopping Attack": "configure the native VLAN with a dedicated nondefault VLAN ID"
      }
    }
  }
];
