
# thanks to http://allanmcrae.com/2013/09/routing-traffic-with-openvpn/

# OpenVPN
iptables -A INPUT -i eth0 -m state --state NEW -p udp --dport 80 -j ACCEPT
 
# Allow TUN interface connections to OpenVPN server
iptables -A INPUT -i tun+ -j ACCEPT
 
# Allow TUN interface connections to be forwarded through other interfaces
iptables -A FORWARD -i tun+ -j ACCEPT
iptables -A FORWARD -i tun+ -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i eth0 -o tun+ -m state --state RELATED,ESTABLISHED -j ACCEPT
 
# NAT the VPN client traffic to the internet
iptables -t nat -A POSTROUTING -s 10.178.207.0/29 -o eth0 -j MASQUERADE

iptables -A OUTPUT -o tun+ -j ACCEPT


